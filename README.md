# HCM Lite — Human Capital Management System

A lightweight, enterprise-grade, browser-based Human Capital Management (HCM) web application built for the **Saylani Modern Web and App Development — Beginner Track Hackathon**.

HCM Lite provides essential HR administration, employee lifecycle tracking, daily attendance management, leave workflows, company policies, and monthly payroll calculation—operating entirely on the client side using pure web standards and browser `localStorage`.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Implemented Features](#implemented-features)
4. [Technology Stack & Architecture](#technology-stack--architecture)
5. [Project Structure](#project-structure)
6. [Local Setup & Getting Started](#local-setup--getting-started)
7. [User Workflow Guide](#user-workflow-guide)
8. [Data Storage & System Limitations](#data-storage--system-limitations)
9. [Automated & Manual Testing Verification](#automated--manual-testing-verification)
10. [Deployment Guide](#deployment-guide)
11. [Hackathon Submission Details](#hackathon-submission-details)

---

## Project Overview

HCM Lite was engineered from the ground up without third-party frameworks, server-side backends, or external databases. Designed with an **Obsidian Slate & Vivid Emerald SaaS design system**, the application offers:
- Fast initial page loads with zero build steps or package dependencies.
- Strict data integrity enforced through centralized `localStorage` schemas.
- Real-time business rule calculations (grace periods, half-day thresholds, working-day payroll deductions).
- Full responsive support with desktop cursor spotlight effects and persistent Dark/Light mode.

---

## User Roles & Permissions

The application implements role-based access control (RBAC) stored in the current session:

| Role | Permitted Areas | Capabilities |
| :--- | :--- | :--- |
| **Admin** | Full system access (`admin.html`, `employees.html`, `leaves.html`, `settings.html`, `payslip.html`) | Setup company policies, manage employee profiles, approve/reject leaves, post company announcements, view workforce KPIs, generate any employee payslip. |
| **Employee** | Self-service portal (`employee.html`, `payslip.html`) | Daily attendance check-in/out, view working hours and status, submit leave applications, track personal leave balance, read announcements, view personal monthly payslip. |

*Unauthenticated users attempting to access dashboard pages are automatically redirected to `index.html`. Employees attempting to access admin-only pages are redirected to their portal.*

---

## Implemented Features

### 1. First-Run Setup & Authentication
- **Onboarding Wizard**: Detects an empty application state on first visit and presents a company initialization form (Company Name, Admin Name, Email, Password).
- **Session Persistence**: Active user session is maintained in `hcm_session`.
- **Role Redirection**: Automatic routing on login (`admin` to `pages/admin.html`, `employee` to `pages/employee.html`).
- **Password Security**: Self-service password change modal with validation (minimum 4 characters, current password confirmation, duplicate rejection).

### 2. Employee Management (Admin)
- **Directory CRUD**: Add, view, edit, and delete employee profiles.
- **Auto-Provisioned Access**: Adding an employee automatically provisions login credentials with their specified email and default password.
- **Form Validation**: Client-side validation for required fields, RFC-compliant email syntax, case-insensitive duplicate email detection, and positive monthly salaries (`> 0`).
- **Live Filtering**: Instant name/email search bar and department filter dropdown.

### 3. Daily Attendance System
- **Single Daily Record**: Enforces strictly one check-in and one check-out per employee per calendar day.
- **Configurable Grace Period**: Reads office start time (e.g. `09:00`) and grace minutes (e.g. `15`) from company settings. Check-ins up to `09:15` are marked **Present (On-Time)**; check-ins after are flagged **Late**.
- **Working Duration & Half-Day Rule**: Computes exact elapsed hours from timestamps. Shifts under 5 hours automatically transition from Present/Late to **Half Day**.
- **Absence Detection**: Absences are determined dynamically by comparing working days against actual attendance entries; historical dummy data is never fabricated.

### 4. Leave Management & Approval Workflow
- **Application Portal**: Employees apply by choosing leave type (Annual, Sick, Casual, Unpaid), start date, end date, and reason.
- **Working-Day Calendar Calculation**: Excludes Saturdays and Sundays from requested day totals.
- **Constraint Validation**: Enforces start date $\le$ end date, rejects overlapping pending/approved dates for the same employee, and blocks applications exceeding the employee's remaining yearly quota.
- **Admin Review Queue**: Admins approve or reject applications with optional review remarks. Approvals dynamically deduct from the yearly quota.

### 5. Company Settings & Policies
- **Dynamic Configuration**: Admin configures Company Name, Office Start Time, Grace Period (minutes), Yearly Leave Quota, and Working Days (Monday–Friday toggles).
- **Global Integration**: All attendance evaluations, absence calculations, and leave quotas immediately react to updated settings without hardcoded constants.

### 6. Monthly Payslip Generator & Export
- **Exact Pro-Rata Formula**:
  $$\text{Per-Day Salary} = \frac{\text{Monthly Base Salary}}{\text{Total Working Days in Month}}$$
  $$\text{Deductions} = \text{Per-Day Salary} \times (\text{Absent Days} + 0.5 \times \text{Half-Day Count})$$
  $$\text{Net Salary} = \text{Monthly Base Salary} - \text{Total Deductions}$$
- **Boundary Precision**: Excludes unelapsed future working days and days prior to an employee's joining date from absence penalties. Approved leaves are treated as fully paid.
- **Export & Print**: Clean CSV export (`exportPayslipCSV`) and print stylesheet (`@media print`) formatted as a formal compensation voucher.

### 7. Client-Side Smart Helper
- **Interactive Assistant**: Built-in chat assistant floating on both Admin and Employee dashboards.
- **Direct Data Answers**: Resolves natural language inquiries against live `localStorage` data:
  - *Admin*: Total active employee count, staff on leave today, late arrivals today.
  - *Employee*: Remaining leave balance, personal attendance status today, total hours worked this week.
- **Privacy Partitioning**: Strictly isolates company-wide metrics away from employee accounts.

### 8. Announcements Feed
- **Notice Board**: Admin posts company-wide broadcast notices with timestamps.
- **Real-Time Display**: Renders immediately on both dashboards, with Admin deletion privileges.

### 9. Modern UI/UX, Themes & Micro-Interactions
- **Theme Engine**: Built-in Dark and Light mode toggle with an Obsidian Slate dark palette (`[data-theme="dark"]`). User choice is saved in `hcm_theme_pref` and loaded with zero flicker via early `<head>` scripts.
- **Cursor Spotlight**: Ambient radial glow effect tracking the mouse pointer on `.has-spotlight` containers, restricted strictly to desktop pointer devices (`pointer: fine`) with reduced-motion safeguards.
- **Responsive Layout**: Collapsible mobile drawer sidebar (`#sidebar-toggle`, `.sidebar.open`, `#sidebar-overlay`), fluid tables with horizontal scrolling, and touch-friendly controls.

---

## Technology Stack & Architecture

- **Structure**: Semantic HTML5 (Single root `index.html`, organized subpages in `pages/`).
- **Styling**: Vanilla CSS3 using custom properties (CSS variables), Flexbox, CSS Grid, and responsive media queries. No Tailwind, Bootstrap, or utility frameworks.
- **Logic**: Pure Vanilla ECMAScript (ES6+). Modular separation across functional domains without Node.js or bundlers.
- **Storage**: Browser Web Storage API (`localStorage`), organized under five strict keys:
  - `hcm_company`: Company configuration, working days, and broadcast announcements.
  - `hcm_users`: Admin and employee user profiles, credentials, departments, and salaries.
  - `hcm_attendance`: Historical daily check-in and check-out logs.
  - `hcm_leaves`: Leave requests, statuses, dates, and administrative comments.
  - `hcm_session`: Current active user session.
  - *(Optional UI preference)* `hcm_theme_pref`: Isolated theme setting.
- **Typography & Icons**: Google Fonts (`Inter`, `Plus Jakarta Sans`) and native Unicode emojis.

---

## Project Structure

```text
HCM-Lite/
├── .agents/
│   └── rules/
│       └── rules.md                # Hackathon requirements & project rules
├── .gitignore                      # Git exclusion rules for OS and editor artifacts
├── .nojekyll                       # GitHub Pages directive to bypass Jekyll engine
├── index.html                      # Root entry: First-run setup & user login
├── README.md                       # Comprehensive project documentation
├── css/
│   └── style.css                   # Unified design system, tokens & dark mode
├── js/
│   ├── attendance.js               # Attendance checking, late detection & work hours
│   ├── auth.js                     # Authentication, session guards & password reset
│   ├── employees.js                # Employee CRUD, validation, search & filtering
│   ├── helper.js                   # String sanitizers, theme engine, spotlight & smart helper
│   ├── leave.js                    # Leave quotas, weekend skips & approval engine
│   ├── payslip.js                  # Payroll calculations & absence deduction formulas
│   └── storage.js                  # Centralized localStorage read/write abstractions
└── pages/
    ├── admin.html                  # Admin command center & live stat cards
    ├── employee.html               # Employee self-service attendance & leave portal
    ├── employees.html              # Employee directory & department management
    ├── leaves.html                 # Administrative leave review queue
    ├── payslip.html                # Monthly payslip review, print & CSV export
    └── settings.html               # Organisation policies & office timing configuration
```

---

## Local Setup & Getting Started

### Prerequisites
A modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari) with JavaScript enabled.

### Installation Steps
1. **Clone or Download the Repository**:
   ```bash
   git clone [Insert Your GitHub Repository URL here]
   cd HCM-Lite
   ```
   *(Or download and extract the ZIP archive).*

2. **Open in Your Editor**:
   Open the root `HCM-Lite` folder in Visual Studio Code or your preferred editor.

3. **Run Locally**:
   - **Option A (VS Code Live Server)**: Right-click `index.html` and select **Open with Live Server**.
   - **Option B (Direct Browser File)**: Double-click `index.html` to open it directly via `file:///` protocol in your browser.

4. **First-Run Setup**:
   - Because HCM Lite starts completely empty (zero dummy records), the onboarding screen will automatically prompt you to create your initial **Company** and **Admin Account**.
   - Fill in your company name, admin name, admin email, and a password (min. 4 characters).
   - Click **Create Account & Continue** to enter the Admin Dashboard.

---

## User Workflow Guide

### Admin Workflow
1. **Configure Policies**: Navigate to **Settings** (`pages/settings.html`). Verify or adjust the office start time, grace minutes, yearly quota, and active working days.
2. **Add Employees**: Navigate to **Employees** (`pages/employees.html`) and click **+ Add Employee**. Enter name, email, department, designation, joining date, and monthly salary.
3. **Review Attendance**: Monitor the live stat cards on the **Dashboard** (`pages/admin.html`) to see today's present, late, half-day, and on-leave counts.
4. **Approve Leaves**: Visit **Leaves** (`pages/leaves.html`) to review pending employee requests, approve or reject with comments.
5. **Generate Payslips**: Open **Payslips** (`pages/payslip.html`), select an employee and pay period, review gross and net salary, and export as CSV or click Print for a clean PDF.
6. **Post Notices**: Use the Announcements widget on the dashboard to broadcast updates to staff.

### Employee Workflow
1. **Sign In**: Log out of Admin and sign in using the email and password generated for an employee.
2. **Daily Check-In**: On the **Employee Portal** (`pages/employee.html`), click **Check In**. The system records the exact time and flags whether you were on time or late based on company grace limits.
3. **Daily Check-Out**: At shift end, click **Check Out**. The system computes total hours worked.
4. **Apply for Leave**: Fill out the leave request form with dates and reason. The form displays real-time remaining quota balance.
5. **Review Payslip**: Click **View My Payslip** in the header to review your monthly salary, attendance summary, and verified deductions.

---

## Data Storage & System Limitations

- **Browser-Scoped Storage**: All records reside inside the browser's `localStorage` under the exact domain/origin where it is loaded. Data does not synchronize across separate devices, private windows, or different web browsers.
- **Empty Initialization**: Conforming strictly to hackathon guidelines, the application does not preload mock employees, fabricated attendance, or sample leaves.
- **Educational Prototype Disclaimer**: Client-side role checks and session validation are implemented for demonstration and workflow modeling. In a production SaaS environment, authentication, authorization, and data storage must be backed by a secure server and encrypted database.

---

## Automated & Manual Testing Verification

The codebase has undergone automated and manual test verification:

### Automated Test Suites
1. **Application Compliance Audit (`scratch/test_all.ps1`)**:
   - **56 / 56 tests passed**.
   - Validated: Required files, exact `localStorage` keys, absence of forbidden external libraries, role protection redirects, sidebar navigation links, payslip deduction formulas, and password reset policies.
2. **UI & Theme Suite (`scratch/test_theme_spotlight.ps1`)**:
   - **60 / 60 tests passed**.
   - Validated: `hcm_theme_pref` key isolation, zero-flicker `<head>` scripts across all 7 pages, dark mode token definitions, pointer media query constraints for cursor spotlight, and responsive mobile sidebar states.
3. **Core Payroll & Formula Suite (`scratch/test_stage5.ps1`)**:
   - **25 / 25 tests passed**.
   - Validated: Pro-rata per-day salary calculations, half-day 0.5× penalties, join-date absence boundaries, and zero-day safe divisions.

### Manual Verification
- Verified responsive layout on desktop (1440px), tablet (768px), and mobile viewports (375px/400px).
- Confirmed print view format via browser Print Preview (`Ctrl+P` / `Cmd+P`).

---

## Deployment Guide

HCM Lite is static and ready for free hosting:

### GitHub Pages
1. Push your repository to GitHub.
2. In your repository settings, navigate to **Pages** (under the *Code and automation* section).
3. Under **Build and deployment** $\rightarrow$ **Branch**, select `main` (or `master`) and folder `/ (root)`.
4. Click **Save**. GitHub Pages will deploy the app using the root `index.html` (the included `.nojekyll` file ensures seamless serving).
5. Access your live application at:
   `https://[your-username].github.io/[your-repo-name]/`

### Netlify
1. Log in to [Netlify](https://www.netlify.com/).
2. Drag and drop the `HCM-Lite` folder into the Netlify drop zone (or connect your GitHub repository).
3. Leave the **Build command** empty and set the **Publish directory** to `./` (root).
4. Click **Deploy Site**.

---

## Hackathon Submission Details

- **Event**: Saylani Modern Web and App Development Hackathon
- **Track**: Beginner Track — Saylani HCM Lite
- **Author / Student Name**: `[Insert Your Full Name here]`
- **Roll Number / Student ID**: `[Insert Your Roll Number here]`
- **GitHub Repository**: `[Insert Your GitHub Repository URL here]`
- **Live Deployment URL**: `[Insert Your Live Website URL here]`
- **Date**: October 2026
