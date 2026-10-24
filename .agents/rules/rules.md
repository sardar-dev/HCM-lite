---
trigger: always_on
---

# Saylani HCM Lite — Workspace Rules

## 1. Official Requirements and Tech Stack
- Follow the Saylani HCM Lite Beginner Track assignment exactly.
- Use only HTML, CSS, vanilla JavaScript and browser localStorage.
- Do NOT use Supabase, Firebase, React, Next.js, Vue, TypeScript, Node.js, a backend, npm packages or extra frameworks.
- Chart.js or other optional tools may only be used if the assignment permits them and they are genuinely needed.
- Build a browser-based educational HR management application.
- If a design preference conflicts with a required feature, prioritize the official assignment.

## 2. Application Pages and Structure
Create and maintain these required pages:
- index.html: first-run company setup and login
- pages/admin.html: Admin dashboard
- pages/employees.html: employee management
- pages/leaves.html: leave management and approvals
- pages/settings.html: company settings
- pages/employee.html: Employee dashboard
- pages/payslip.html: monthly payslip

Organize styles in css/style.css and reusable logic in js/storage.js, js/auth.js, js/employees.js, js/attendance.js, js/leave.js and js/helper.js. Use additional files only when useful. Keep paths correct.

## 3. Data and localStorage
Use these exact keys: hcm_company, hcm_users, hcm_attendance, hcm_leaves, hcm_session.
- Start empty. Never insert dummy employees, fake attendance, fabricated dashboard statistics or sample leave requests.
- Show zero counts and meaningful empty states until real app activity creates data.
- Create reusable read/write helpers in js/storage.js.
- Parse JSON safely and handle missing or invalid saved data.
- Keep data formats consistent across pages.
- Do not clear application data during normal initialization.
- Test persistence across navigation and refresh.

## 4. Authentication and Roles
- Support first-run company setup and initial Admin account creation.
- Implement login, logout and password change.
- Store the current user in hcm_session.
- Restrict pages and actions by role. Redirect unauthenticated users to login and Employees away from Admin-only pages.
- Adding an employee creates the corresponding Employee login.
- Validate inputs and handle incorrect credentials clearly.
- Keep user IDs consistent across features.
- This is a localStorage-only educational demo, not production-secure authentication. Never represent client-side role checks as strong security.

## 5. Employee Management and Validation
- Admin can add, edit, delete, search and filter employees by department.
- Validate required fields and email format.
- Reject duplicate emails case-insensitively.
- Salary must be a valid number greater than zero.
- Show errors beside relevant fields.
- Confirm destructive actions and keep related records consistent when an employee changes or is deleted.

## 6. Company Settings
Let Admin manage company name, office start time, grace minutes, yearly leave quota and working days. Read these values from hcm_company, not hardcoded values.

## 7. Attendance Business Rules
- Employees can check in/out for themselves.
- One attendance entry per employee per day; check-out only after check-in and only once.
- Mark Late only after office start time plus grace period.
- Calculate working duration from actual timestamps. Under five hours is Half Day.
- Support Present, Late, Half Day and Absent.
- Determine absence from missing records on working days; do not invent historical attendance.
- Handle invalid dates and times safely.
- Refresh counts after changes.

## 8. Leave Management Rules
- Employees can apply for leave, see request status and remaining balance.
- Admin can approve/reject requests and add a comment.
- Start date must be on or before end date.
- Count working days only and exclude weekends.
- Reject overlapping leave requests for the same employee.
- Enforce the yearly quota using approved leave days.
- Pending/rejected requests must not incorrectly reduce approved balance.
- Recalculate balances after relevant status changes.

## 9. Dashboard, Payslip and Announcements
- Calculate statistics from actual localStorage records.
- Admin sees company data; Employees see only their own data.
- Admin can post announcements and Employees can read them.
- Generate monthly payslips from actual salary and attendance.
- Per-day salary = monthly salary / working days in month.
- Deduction = per-day salary × (absent days + 0.5 × half-day count).
- Net salary = monthly salary - deduction.
- Handle zero working days and invalid salaries safely.
- Make payslips printable/saveable as PDF through browser printing.
- Never hardcode financial figures or fake statistics.

## 10. Smart Helper
- Build a JavaScript-powered chat helper on both dashboards.
- Match supported questions using keywords and answer from actual app data.
- Admin: employee count, leave today and late today.
- Employee: leave balance, lateness today and hours worked this week.
- Never expose company-wide private information to Employees.
- Calculate answers instead of fabricating them. An external LLM API is optional and must not delay core features.

## 11. Premium UI/UX
- Understand the purpose before designing.
- Create a distinctive, polished HR product, not a generic AI template.
- Use strong typography, spacing, hierarchy, restrained shadows and a consistent design system.
- Use an appropriate coordinated palette.
- Make dashboards easy to scan; polish forms, tables, navigation, status badges, dialogs, empty states and feedback messages.
- Use meaningful icons and microcopy.
- Avoid excessive gradients, unnecessary glassmorphism, clutter and pointless decoration.
- Keep essential actions obvious and page styling consistent.

## 12. Mouse Effects and Animations
- Add tasteful hover effects to buttons, links, cards and interactive elements.
- Use smooth transitions, subtle scaling, gentle lifts and restrained shadow/border effects.
- Add a cursor-following spotlight only where appropriate.
- Keep animations short, performant and non-distracting; no excessive trails or parallax.
- Use CSS and vanilla JavaScript only.
- Never obstruct clicks, forms or navigation. Support touchscreens and prefers-reduced-motion.
- Provide visible focus states; do not rely on hover alone.

## 13. Responsive Design and Accessibility
- Test desktop, tablet and mobile layouts.
- Prevent overflow and unusable tables.
- Use semantic HTML, associated labels, accessible contrast and keyboard-friendly controls.
- Keep forms and navigation usable on phones.

## 14. Development Workflow
- Inspect existing files before editing; preserve working functionality.
- Work incrementally in small, verifiable stages.
- Build required features before optional bonuses.
- Plan before substantial changes.
- Reuse functions, use clear names and helpful comments, and avoid unnecessary dependencies.
- Preserve a recoverable checkpoint before major changes where practical.
- Do not delete unrelated files or overwrite user work without approval.

## 15. Testing and Error Fixing
- Run in a browser whenever possible.
- Test setup, login/logout, role restrictions, employee CRUD, attendance edge cases, leave validation/overlaps/balances, dashboard figures and payslip calculations.
- Test helper answers, navigation, refresh persistence, empty states and responsive layouts.
- Inspect console errors and failed requests. Fix issues and retest.
- Do not claim tests passed unless actually run; report anything not tested.

## 16. Security and Final Delivery
- Never request or expose real private credentials.
- Do not add a backend/database or silently bypass required rules.
- Keep the project compatible with GitHub and free static hosting.
- Verify all seven pages, document setup/use in README.md and state remaining limitations.
- Prioritize correct functionality, clean code and reliable demo behavior over unnecessary complexity.