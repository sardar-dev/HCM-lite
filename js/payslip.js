/**
 * HCM-Lite — Payslip Calculation Module (Stage 5)
 *
 * Implements the official payslip formula:
 * - Per-day salary = Monthly salary / Working days in selected month
 * - Deduction = Per-day salary × (Absent days + 0.5 × Half Day count)
 * - Net salary = Monthly salary - Deduction
 *
 * Business Rules:
 * - Excludes future working days in current month from absences
 * - Excludes days prior to employee joining date from absences
 * - Approved leaves are treated as paid and not deducted
 * - Late arrivals are counted as present (not absent)
 * - Half day counts as 0.5 day deduction
 * - Handles zero working days and invalid values safely
 */

'use strict';

/**
 * Calculates a monthly payslip for an employee.
 *
 * @param {string} employeeId
 * @param {string} monthStr - 'YYYY-MM'
 * @returns {object|null}
 */
function calculateEmployeePayslip(employeeId, monthStr) {
  if (!employeeId || !monthStr) return null;

  const users = getUsers();
  const employee = users.find(u => u.id === employeeId);
  if (!employee) return null;

  const company = getCompanySettings();
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return null;
  }

  // Total days in this specific month
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Configured company working days (e.g. ['Monday', 'Tuesday', ...])
  const configuredWorkingDays = company.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Local boundary checks
  const todayStr = getTodayDateString();
  const [curY, curM] = todayStr.split('-').map(Number);
  const joiningDateStr = (employee.createdAt || '').slice(0, 10);

  let monthType = 'past';
  if (year > curY || (year === curY && month > curM)) {
    monthType = 'future';
  } else if (year === curY && month === curM) {
    monthType = 'current';
  }

  let totalWorkingDays = 0;
  let presentOnTimeCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;
  let approvedLeaveCount = 0;
  let absentCount = 0;
  let futureWorkingDays = 0;

  const attendance = getAttendance();
  const leaves = getLeaves();

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, d);
    const dayName = getDayName(dateObj);
    const isWorkingDay = configuredWorkingDays.includes(dayName);

    if (isWorkingDay) {
      totalWorkingDays++;

      // Rule: Future working days in current or future month must not count as absent
      if (monthType === 'future' || (monthType === 'current' && dStr > todayStr)) {
        futureWorkingDays++;
        continue;
      }

      // Rule: If reliable joining date exists, do not count days before employment as absent
      if (joiningDateStr && dStr < joiningDateStr) {
        continue;
      }

      // Check attendance records
      const att = attendance.find(a => a.userId === employeeId && a.date === dStr);
      if (att) {
        if (att.status === 'present') {
          presentOnTimeCount++;
        } else if (att.status === 'late') {
          // Late is counted as present (not absent)
          lateCount++;
        } else if (att.status === 'half-day') {
          halfDayCount++;
        }
      } else {
        // No attendance record; check if on approved leave
        const onLeave = leaves.some(l =>
          l.userId === employeeId &&
          l.status === 'approved' &&
          l.startDate <= dStr &&
          l.endDate >= dStr
        );
        if (onLeave) {
          approvedLeaveCount++;
        } else {
          // Missing attendance on a past working day = Absent
          absentCount++;
        }
      }
    }
  }

  const monthlySalary = Math.max(0, Number(employee.salary) || 0);
  const perDaySalary = totalWorkingDays > 0 ? (monthlySalary / totalWorkingDays) : 0;
  const absenceDeduction = perDaySalary * absentCount;
  const halfDayDeduction = perDaySalary * (0.5 * halfDayCount);
  const totalDeductions = absenceDeduction + halfDayDeduction;
  const netSalary = Math.max(0, monthlySalary - totalDeductions);

  const dateForLabel = new Date(year, month - 1, 1);
  const monthLabel = dateForLabel.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    employeeEmail: employee.email,
    department: employee.department,
    designation: employee.designation,
    joiningDate: joiningDateStr || '—',
    companyName: company.name,
    monthStr,
    monthLabel,
    year,
    month,
    monthlySalary,
    totalWorkingDays,
    presentOnTimeCount,
    lateCount,
    halfDayCount,
    totalPresentCount: presentOnTimeCount + lateCount + halfDayCount,
    approvedLeaveCount,
    absentCount,
    futureWorkingDays,
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    absenceDeduction: Math.round(absenceDeduction * 100) / 100,
    halfDayDeduction: Math.round(halfDayDeduction * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100,
    generatedDate: formatDisplayDate(todayStr),
  };
}
