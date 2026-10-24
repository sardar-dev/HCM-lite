/**
 * HCM-Lite — Auth Module
 *
 * First-run setup, login, logout, session, role-based page guards.
 */

'use strict';

/* ============================================================
   First-Run Detection
   ============================================================ */

/**
 * Returns true when the app has never been set up (no company record).
 */
function isFirstRun() {
  return getCompany() === null;
}

/* ============================================================
   Setup (Company + Admin account)
   ============================================================ */

/**
 * Process the first-run setup form.
 * Creates the company record and the initial Admin user.
 * @param {HTMLFormElement} form
 * @returns {boolean} success
 */
function handleSetup(form) {
  const companyName = form.querySelector('#setup-company').value.trim();
  const adminName   = form.querySelector('#setup-name').value.trim();
  const adminEmail  = form.querySelector('#setup-email').value.trim();
  const adminPass   = form.querySelector('#setup-password').value;

  // Validate
  const validations = [
    {
      field: form.querySelector('#setup-company'),
      rules: [{ test: v => v.trim().length > 0, message: 'Company name is required.' }],
    },
    {
      field: form.querySelector('#setup-name'),
      rules: [{ test: v => v.trim().length > 0, message: 'Your name is required.' }],
    },
    {
      field: form.querySelector('#setup-email'),
      rules: [
        { test: v => v.trim().length > 0, message: 'Email is required.' },
        { test: v => isValidEmail(v), message: 'Enter a valid email address.' },
      ],
    },
    {
      field: form.querySelector('#setup-password'),
      rules: [
        { test: v => v.length >= 4, message: 'Password must be at least 4 characters.' },
      ],
    },
  ];

  if (!validateFields(form, validations)) return false;

  // Save company with standard default policies
  setCompany({
    name: companyName,
    officeStartTime: '09:00',
    graceMinutes: 15,
    leaveQuota: 20,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    createdAt: new Date().toISOString()
  });

  // Create admin user
  const adminUser = {
    id: generateId(),
    name: adminName,
    email: adminEmail.toLowerCase(),
    password: adminPass,       // plain-text is fine for localStorage demo
    role: 'admin',
    department: 'Management',
    designation: 'Administrator',
    salary: 0,
    createdAt: new Date().toISOString(),
  };
  setUsers([adminUser]);

  // Auto-login
  loginUser(adminUser);
  return true;
}

/* ============================================================
   Login / Logout
   ============================================================ */

/**
 * Attempt login with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {{success: boolean, message?: string}}
 */
function attemptLogin(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user) return { success: false, message: 'No account found with this email.' };
  if (user.password !== password) return { success: false, message: 'Incorrect password.' };
  loginUser(user);
  return { success: true };
}

/**
 * Set session for a user object.
 */
function loginUser(user) {
  setSession({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  });
}

/**
 * Logout: clear session and redirect to login page.
 */
function logout() {
  clearSession();
  window.location.href = pagePath('index.html');
}

/* ============================================================
   Session / Guards
   ============================================================ */

/**
 * Get the current session or null.
 */
function currentSession() {
  return getSession();
}

/**
 * Require authentication – redirect to login if no session.
 * @returns {object|null} session
 */
function requireAuth() {
  const session = currentSession();
  if (!session) {
    window.location.href = pagePath('index.html');
    return null;
  }
  return session;
}

/**
 * Require admin role – redirect if not admin.
 * @returns {object|null} session
 */
function requireAdmin() {
  const session = requireAuth();
  if (session && session.role !== 'admin') {
    window.location.href = pagePath('employee.html');
    return null;
  }
  return session;
}

/**
 * Require employee role – redirect if not employee.
 * @returns {object|null} session
 */
function requireEmployee() {
  const session = requireAuth();
  if (session && session.role !== 'employee') {
    window.location.href = pagePath('admin.html');
    return null;
  }
  return session;
}

/**
 * Redirect already-logged-in users away from the login page.
 */
function redirectIfLoggedIn() {
  const session = currentSession();
  if (session) {
    if (session.role === 'admin') {
      window.location.href = pagePath('admin.html');
    } else {
      window.location.href = pagePath('employee.html');
    }
  }
}

/* ============================================================
   Sidebar User Info
   ============================================================ */

/**
 * Populate sidebar user display with session info.
 */
function populateSidebarUser() {
  const session = currentSession();
  if (!session) return;

  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) roleEl.textContent = capitalise(session.role);
  if (avatarEl) avatarEl.textContent = getInitials(session.name);

  // Set company name in sidebar brand
  const company = getCompany();
  const brandEl = document.getElementById('sidebar-company');
  if (brandEl && company) brandEl.textContent = company.name;
}

/* ============================================================
   Password Change
   ============================================================ */

/**
 * Change a user's password in hcm_users.
 * Enforces current password match and minimum length of 4 characters.
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {{success: boolean, message: string}}
 */
function changeUserPassword(userId, currentPassword, newPassword) {
  if (!userId) return { success: false, message: 'Invalid user session.' };
  if (!currentPassword) return { success: false, message: 'Current password is required.' };
  if (!newPassword || newPassword.length < 4) {
    return { success: false, message: 'New password must be at least 4 characters long.' };
  }

  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, message: 'User record not found.' };

  if (user.password !== currentPassword) {
    return { success: false, message: 'Current password is incorrect.' };
  }

  if (currentPassword === newPassword) {
    return { success: false, message: 'New password must be different from current password.' };
  }

  user.password = newPassword;
  setUsers(users);
  return { success: true, message: 'Password updated successfully!' };
}
