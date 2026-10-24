/**
 * HCM-Lite — Leave Management Module (Stage 3)
 *
 * Implements business rules:
 * - Calculate requested working days (Mon-Fri only, excludes Sat/Sun)
 * - Single-day and multi-day leave validation (start <= end)
 * - Overlap rejection against pending and approved requests
 * - Enforce yearly leave quota from hcm_company
 * - Admin approval/rejection with comments & re-checks
 * - Real-time leave balance calculations (pending/rejected don't reduce quota)
 * - Pure localStorage, no dummy data
 */

'use strict';

/* ============================================================
   Constants
   ============================================================ */

const LEAVE_TYPES = Object.freeze([
  'Casual Leave',
  'Sick Leave',
  'Annual Leave',
]);

/* ============================================================
   Date & Calendar Helpers (Timezone-safe)
   ============================================================ */

/**
 * Parses 'YYYY-MM-DD' into local Date at 00:00:00 without UTC shift bugs.
 * @param {string} dateStr
 * @returns {Date|null}
 */
function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

/**
 * Calculates working days between two dates, excluding Saturday and Sunday.
 * Start date must be <= end date.
 *
 * @param {string} startDateStr - 'YYYY-MM-DD'
 * @param {string} endDateStr - 'YYYY-MM-DD'
 * @returns {number} count of working days
 */
function calculateWorkingDays(startDateStr, endDateStr) {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (!start || !end || start > end) return 0;

  let count = 0;
  const cur = new Date(start.getTime());
  while (cur <= end) {
    const day = cur.getDay(); // 0 = Sunday, 6 = Saturday
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Formats a date range into a clean string (e.g. 'Oct 26, 2026 – Oct 28, 2026' or 'Oct 26, 2026').
 * @param {string} startStr
 * @param {string} endStr
 * @returns {string}
 */
function formatLeaveDateRange(startStr, endStr) {
  if (!startStr) return '—';
  if (!endStr || startStr === endStr) {
    return formatDisplayDate(startStr);
  }
  return `${formatDisplayDate(startStr)} – ${formatDisplayDate(endStr)}`;
}

/* ============================================================
   Leave Balance Calculations
   ============================================================ */

/**
 * Calculates an employee's leave balance for a given year.
 * Only APPROVED leave requests reduce the remaining quota.
 * Pending and rejected requests do NOT reduce the quota.
 *
 * @param {string} userId
 * @param {number} [year=new Date().getFullYear()]
 * @returns {{
 *   quota: number,
 *   approvedDays: number,
 *   remainingDays: number,
 *   pendingDays: number,
 *   year: number
 * }}
 */
function getEmployeeLeaveBalance(userId, year = new Date().getFullYear()) {
  const settings = getCompanySettings();
  const quota = Number(settings.leaveQuota) || 20;
  const leaves = getLeaves();
  const yearStr = String(year);

  // Filter approved leaves for this employee in the specified year
  const approvedLeaves = leaves.filter(l =>
    l.userId === userId &&
    l.status === 'approved' &&
    typeof l.startDate === 'string' &&
    l.startDate.startsWith(yearStr)
  );

  const approvedDays = approvedLeaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);
  const remainingDays = Math.max(0, quota - approvedDays);

  // Compute pending days for display awareness
  const pendingLeaves = leaves.filter(l =>
    l.userId === userId &&
    l.status === 'pending' &&
    typeof l.startDate === 'string' &&
    l.startDate.startsWith(yearStr)
  );
  const pendingDays = pendingLeaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);

  return {
    quota,
    approvedDays,
    remainingDays,
    pendingDays,
    year,
  };
}

/* ============================================================
   Overlap Detection
   ============================================================ */

/**
 * Checks whether a proposed date range overlaps any existing leave request for an employee.
 * By default, checks against both 'pending' and 'approved' requests.
 *
 * @param {string} userId
 * @param {string} startDateStr - 'YYYY-MM-DD'
 * @param {string} endDateStr - 'YYYY-MM-DD'
 * @param {string|null} [excludeRequestId=null] - request ID to ignore (self)
 * @param {boolean} [checkApprovedOnly=false] - only check approved requests (for approval recheck)
 * @returns {boolean} true if overlap found
 */
function hasLeaveOverlap(userId, startDateStr, endDateStr, excludeRequestId = null, checkApprovedOnly = false) {
  const leaves = getLeaves();
  return leaves.some(l => {
    if (l.userId !== userId) return false;
    if (excludeRequestId && l.id === excludeRequestId) return false;

    if (checkApprovedOnly) {
      if (l.status !== 'approved') return false;
    } else {
      if (l.status !== 'pending' && l.status !== 'approved') return false;
    }

    // Overlap condition: startA <= endB && endA >= startB
    return startDateStr <= l.endDate && endDateStr >= l.startDate;
  });
}

/* ============================================================
   Leave Application (Employee)
   ============================================================ */

/**
 * Submit a new leave application for an employee.
 * Validates dates, working days, overlaps, and remaining quota.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.leaveType
 * @param {string} params.startDate - 'YYYY-MM-DD'
 * @param {string} params.endDate - 'YYYY-MM-DD'
 * @param {string} params.reason
 * @returns {{success: boolean, message: string, leave?: object}}
 */
function applyForLeave({ userId, leaveType, startDate, endDate, reason }) {
  if (!userId) {
    return { success: false, message: 'Employee ID is required.' };
  }

  // Validate leave type
  if (!leaveType || !LEAVE_TYPES.includes(leaveType)) {
    return { success: false, message: 'Please select a valid leave type.' };
  }

  // Validate dates presence
  if (!startDate || !endDate) {
    return { success: false, message: 'Start date and end date are required.' };
  }

  const sDate = parseLocalDate(startDate);
  const eDate = parseLocalDate(endDate);
  if (!sDate || !eDate) {
    return { success: false, message: 'Invalid date format provided.' };
  }

  // Rule: Start date must be on or before end date
  if (startDate > endDate) {
    return { success: false, message: 'Start date must be on or before end date.' };
  }

  // Calculate working days (excluding weekends)
  const workingDays = calculateWorkingDays(startDate, endDate);
  if (workingDays === 0) {
    return {
      success: false,
      message: 'Selected date range contains no working days (Saturday & Sunday are non-working days).',
    };
  }

  // Validate reason
  const trimmedReason = (reason || '').trim();
  if (trimmedReason.length < 3) {
    return { success: false, message: 'Please provide a reason for your leave (min. 3 characters).' };
  }

  // Rule: Reject overlapping requests for the same employee (pending or approved)
  if (hasLeaveOverlap(userId, startDate, endDate)) {
    return {
      success: false,
      message: 'You already have a pending or approved leave request that overlaps with this date range.',
    };
  }

  // Rule: Prevent requests that exceed remaining quota
  const leaveYear = parseInt(startDate.slice(0, 4), 10) || new Date().getFullYear();
  const balance = getEmployeeLeaveBalance(userId, leaveYear);
  if (workingDays > balance.remainingDays) {
    return {
      success: false,
      message: `Requested ${workingDays} working day(s) exceeds your remaining yearly quota (${balance.remainingDays} day(s) left).`,
    };
  }

  // Build leave record
  const users = getUsers();
  const employee = users.find(u => u.id === userId);

  const newLeave = {
    id: generateId(),
    userId: userId,
    employeeName: employee ? employee.name : 'Unknown',
    department: employee ? employee.department : '—',
    leaveType: leaveType,
    startDate: startDate,
    endDate: endDate,
    days: workingDays,
    reason: trimmedReason,
    status: 'pending',
    adminComment: '',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
  };

  const leaves = getLeaves();
  leaves.push(newLeave);
  setLeaves(leaves);

  return {
    success: true,
    leave: newLeave,
    message: `Leave request for ${workingDays} working day(s) submitted successfully.`,
  };
}

/* ============================================================
   Leave Review (Admin: Approve / Reject)
   ============================================================ */

/**
 * Process a leave request as Admin (approve or reject).
 * Rechecks overlaps and remaining quota before approval.
 * Prevents processing the same request multiple times.
 *
 * @param {string} leaveId
 * @param {'approve'|'reject'} action
 * @param {string} [adminComment='']
 * @param {object|null} [adminSession=null]
 * @returns {{success: boolean, message: string, leave?: object}}
 */
function reviewLeaveRequest(leaveId, action, adminComment = '', adminSession = null) {
  if (!leaveId) {
    return { success: false, message: 'Leave ID is required.' };
  }

  const leaves = getLeaves();
  const leaveIndex = leaves.findIndex(l => l.id === leaveId);
  if (leaveIndex === -1) {
    return { success: false, message: 'Leave request not found.' };
  }

  const leave = leaves[leaveIndex];

  // Rule: Prevent processing the same request multiple times
  if (leave.status !== 'pending') {
    return {
      success: false,
      message: `This leave request has already been ${leave.status}.`,
    };
  }

  if (action === 'approve') {
    // Rule: Recheck overlaps before approval in case another request was approved since submission
    if (hasLeaveOverlap(leave.userId, leave.startDate, leave.endDate, leave.id, true)) {
      return {
        success: false,
        message: 'Cannot approve: this request conflicts with another already approved leave for this employee.',
      };
    }

    // Rule: Recheck yearly quota before approval
    const leaveYear = parseInt(leave.startDate.slice(0, 4), 10) || new Date().getFullYear();
    const balance = getEmployeeLeaveBalance(leave.userId, leaveYear);
    if (leave.days > balance.remainingDays) {
      return {
        success: false,
        message: `Cannot approve: requires ${leave.days} day(s) but employee only has ${balance.remainingDays} day(s) remaining.`,
      };
    }

    leave.status = 'approved';
  } else if (action === 'reject') {
    leave.status = 'rejected';
  } else {
    return { success: false, message: 'Invalid review action.' };
  }

  leave.adminComment = (adminComment || '').trim();
  leave.reviewedAt = new Date().toISOString();
  leave.reviewedBy = adminSession ? adminSession.name : 'Admin';

  leaves[leaveIndex] = leave;
  setLeaves(leaves);

  const verb = leave.status === 'approved' ? 'approved' : 'rejected';
  return {
    success: true,
    leave,
    message: `Leave request has been ${verb} successfully.`,
  };
}

/* ============================================================
   Query & Reporting Helpers
   ============================================================ */

/**
 * Get leave requests for a single employee, sorted newest to oldest.
 * @param {string} userId
 * @returns {Array<object>}
 */
function getEmployeeLeaves(userId) {
  return getLeaves()
    .filter(l => l.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get all leave requests for admin review with optional filtering.
 * @param {object} [filters={}]
 * @param {string} [filters.status='all'] - 'all'|'pending'|'approved'|'rejected'
 * @param {string} [filters.search=''] - employee name or reason
 * @returns {Array<object>}
 */
function getAllLeaveRequests(filters = {}) {
  const { status = 'all', search = '' } = filters;
  let leaves = getLeaves();

  if (status && status !== 'all') {
    leaves = leaves.filter(l => l.status === status);
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    leaves = leaves.filter(l =>
      (l.employeeName && l.employeeName.toLowerCase().includes(q)) ||
      (l.reason && l.reason.toLowerCase().includes(q)) ||
      (l.department && l.department.toLowerCase().includes(q)) ||
      (l.leaveType && l.leaveType.toLowerCase().includes(q))
    );
  }

  return leaves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get count summary of leave requests for admin stats.
 * @returns {{
 *   total: number,
 *   pending: number,
 *   approved: number,
 *   rejected: number
 * }}
 */
function getLeaveStatistics() {
  const leaves = getLeaves();
  return {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };
}

/* ============================================================
   UI Badge Formatter
   ============================================================ */

/**
 * Returns an HTML status badge for leave status.
 * @param {string} status - 'pending'|'approved'|'rejected'
 * @returns {string}
 */
function getLeaveStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'approved':
      return '<span class="badge badge-success">Approved</span>';
    case 'rejected':
      return '<span class="badge badge-danger">Rejected</span>';
    case 'pending':
    default:
      return '<span class="badge badge-warning">Pending</span>';
  }
}
