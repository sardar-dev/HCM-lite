/**
 * HCM-Lite — Attendance Module (Stage 2)
 *
 * Implements business rules:
 * - Check in / check out once per day per employee
 * - Late detection against company officeStartTime + graceMinutes
 * - Duration calculation from real timestamps
 * - Under 5 hours duration is Half Day
 * - Statuses: Present, Late, Half Day, Absent
 * - Reads settings dynamically from hcm_company
 */

'use strict';

/* ============================================================
   Date & Time Formatting Helpers
   ============================================================ */

/**
 * Returns today's date in local 'YYYY-MM-DD' format.
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
function getTodayDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns time string in 'HH:MM:SS' format.
 * @param {Date} [d=new Date()]
 * @returns {string}
 */
function formatTimeString(d = new Date()) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Converts 'HH:MM:SS' or 'HH:MM' into a friendly 12-hour string (e.g. '09:15 AM').
 * @param {string|null} timeStr
 * @returns {string}
 */
function formatDisplayTime(timeStr) {
  if (!timeStr) return '—';
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return '—';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Formats a 'YYYY-MM-DD' string into a friendly date (e.g. 'Saturday, Oct 24, 2026').
 * @param {string} dateStr
 * @returns {string}
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Returns the full weekday name for a date (e.g. 'Monday').
 * @param {Date|string} dateInput
 * @returns {string}
 */
function getDayName(dateInput) {
  let date;
  if (typeof dateInput === 'string') {
    const [y, m, d] = dateInput.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = dateInput || new Date();
  }
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/* ============================================================
   Business Logic: Late Detection
   ============================================================ */

/**
 * Determines whether a check-in timestamp is considered late.
 * Rule: Late only after office start time plus grace period.
 *
 * @param {Date} checkInDate
 * @param {string} [officeStartTime] - 'HH:MM'
 * @param {number} [graceMinutes] - integer minutes
 * @returns {boolean}
 */
function isCheckInLate(checkInDate = new Date(), officeStartTime, graceMinutes) {
  const settings = getCompanySettings();
  const startTime = officeStartTime || settings.officeStartTime || '09:00';
  const grace = graceMinutes !== undefined ? Number(graceMinutes) : Number(settings.graceMinutes || 15);

  const [startH, startM] = startTime.split(':').map(Number);
  const cutoffMinutes = (startH * 60) + (startM || 0) + grace;

  const checkInMinutes = (checkInDate.getHours() * 60) +
                         checkInDate.getMinutes() +
                         (checkInDate.getSeconds() > 0 ? 0.01 : 0);

  return checkInMinutes > cutoffMinutes;
}

/* ============================================================
   Attendance Actions: Check In & Check Out
   ============================================================ */

/**
 * Record check-in for an employee.
 * Prevents multiple check-ins on the same day.
 *
 * @param {string} userId
 * @param {Date} [now=new Date()]
 * @returns {{success: boolean, message: string, record?: object}}
 */
function checkInEmployee(userId, now = new Date()) {
  if (!userId) {
    return { success: false, message: 'User ID is required.' };
  }

  const today = getTodayDateString(now);
  const attendance = getAttendance();

  // Rule: One attendance entry per employee per day
  const existing = attendance.find(a => a.userId === userId && a.date === today);
  if (existing) {
    return { success: false, message: 'You have already checked in for today.' };
  }

  const settings = getCompanySettings();
  const isLate = isCheckInLate(now, settings.officeStartTime, settings.graceMinutes);
  const timeStr = formatTimeString(now);

  const record = {
    id: generateId(),
    userId: userId,
    date: today,
    checkInTime: timeStr,
    checkInTimestamp: now.getTime(),
    checkOutTime: null,
    checkOutTimestamp: null,
    workHours: 0,
    durationText: '—',
    status: isLate ? 'late' : 'present',
    wasLate: isLate,
    createdAt: now.toISOString(),
  };

  attendance.push(record);
  setAttendance(attendance);

  const statusLabel = isLate ? 'Late' : 'Present';
  return {
    success: true,
    record,
    message: `Checked in at ${formatDisplayTime(timeStr)} (${statusLabel}).`,
  };
}

/**
 * Record check-out for an employee.
 * Check-out only allowed after check-in, and only once.
 * Calculates duration from actual timestamps.
 * Under 5 hours is marked as Half Day.
 *
 * @param {string} userId
 * @param {Date} [now=new Date()]
 * @returns {{success: boolean, message: string, record?: object}}
 */
function checkOutEmployee(userId, now = new Date()) {
  if (!userId) {
    return { success: false, message: 'User ID is required.' };
  }

  const today = getTodayDateString(now);
  const attendance = getAttendance();

  const recordIndex = attendance.findIndex(a => a.userId === userId && a.date === today);
  if (recordIndex === -1) {
    return { success: false, message: 'No check-in record found for today. Please check in first.' };
  }

  const record = attendance[recordIndex];
  if (record.checkOutTime) {
    return { success: false, message: 'You have already checked out for today.' };
  }

  // Calculate duration from actual timestamps
  const checkInMs = record.checkInTimestamp || (function() {
    const [h, m, s] = (record.checkInTime || '00:00:00').split(':').map(Number);
    const [y, mon, d] = record.date.split('-').map(Number);
    return new Date(y, mon - 1, d, h, m, s || 0).getTime();
  })();

  const diffMs = Math.max(0, now.getTime() - checkInMs);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hoursDecimal = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  const durationText = `${hours}h ${mins}m`;

  const timeStr = formatTimeString(now);
  record.checkOutTime = timeStr;
  record.checkOutTimestamp = now.getTime();
  record.workHours = hoursDecimal;
  record.durationText = durationText;
  record.updatedAt = now.toISOString();

  // Rule 7: Under five hours is Half Day
  if (hoursDecimal < 5) {
    record.status = 'half-day';
  } else if (record.wasLate) {
    record.status = 'late';
  } else {
    record.status = 'present';
  }

  attendance[recordIndex] = record;
  setAttendance(attendance);

  return {
    success: true,
    record,
    message: `Checked out at ${formatDisplayTime(timeStr)} (Duration: ${durationText}).`,
  };
}

/* ============================================================
   Query & Reporting Helpers
   ============================================================ */

/**
 * Get today's attendance record for a specific employee.
 * @param {string} userId
 * @param {string} [dateStr=getTodayDateString()]
 * @returns {object|null}
 */
function getEmployeeTodayAttendance(userId, dateStr = getTodayDateString()) {
  const attendance = getAttendance();
  return attendance.find(a => a.userId === userId && a.date === dateStr) || null;
}

/**
 * Get all attendance records for an employee, sorted newest to oldest.
 * @param {string} userId
 * @returns {Array<object>}
 */
function getEmployeeAttendanceHistory(userId) {
  const attendance = getAttendance();
  return attendance
    .filter(a => a.userId === userId)
    .sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.checkInTimestamp || 0) - (a.checkInTimestamp || 0);
    });
}

/**
 * Get all attendance records for a specific date, enriched with employee details.
 * @param {string} [dateStr=getTodayDateString()]
 * @returns {Array<object>}
 */
function getDateAttendanceRecords(dateStr = getTodayDateString()) {
  const attendance = getAttendance().filter(a => a.date === dateStr);
  const users = getUsers();
  const userMap = new Map(users.map(u => [u.id, u]));

  return attendance.map(rec => {
    const user = userMap.get(rec.userId);
    return {
      ...rec,
      employeeName: user ? user.name : 'Unknown Employee',
      employeeEmail: user ? user.email : '',
      department: user ? user.department : '—',
      designation: user ? user.designation : '—',
    };
  });
}

/**
 * Compute daily attendance summary statistics.
 * Determines absence from missing records on working days (Rule 7).
 *
 * @param {string} [dateStr=getTodayDateString()]
 * @returns {{
 *   totalEmployees: number,
 *   presentCount: number,
 *   onTimeCount: number,
 *   lateCount: number,
 *   halfDayCount: number,
 *   absentCount: number,
 *   isWorkingDay: boolean
 * }}
 */
function getAttendanceSummary(dateStr = getTodayDateString()) {
  const employees = getUsers().filter(u => u.role === 'employee');
  const totalEmployees = employees.length;
  const records = getAttendance().filter(a => a.date === dateStr);

  const presentCount = records.length; // Everyone who checked in
  const onTimeCount  = records.filter(a => a.status === 'present').length;
  const lateCount    = records.filter(a => a.status === 'late' || (a.status === 'half-day' && a.wasLate)).length;
  const halfDayCount = records.filter(a => a.status === 'half-day').length;

  const settings = getCompanySettings();
  const dayName = getDayName(dateStr);
  const workingDays = settings.workingDays || [];
  const isWorkingDay = workingDays.includes(dayName);

  // Absence determined from missing records on working days only
  const absentCount = isWorkingDay ? Math.max(0, totalEmployees - presentCount) : 0;

  return {
    totalEmployees,
    presentCount,
    onTimeCount,
    lateCount,
    halfDayCount,
    absentCount,
    isWorkingDay,
  };
}

/* ============================================================
   UI Badge Formatter
   ============================================================ */

/**
 * Returns an HTML status badge for an attendance status.
 * @param {string} status - 'present'|'late'|'half-day'|'absent'|'not-marked'
 * @returns {string}
 */
function getAttendanceBadge(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'present':
      return '<span class="badge badge-success">Present</span>';
    case 'late':
      return '<span class="badge badge-warning">Late</span>';
    case 'half-day':
      return '<span class="badge badge-warning" style="background:#fef3c7;color:#92400e">Half Day</span>';
    case 'absent':
      return '<span class="badge badge-danger">Absent</span>';
    default:
      return '<span class="badge badge-neutral">Not Marked</span>';
  }
}
