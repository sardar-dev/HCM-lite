/**
 * HCM-Lite — Helper / Utility Functions
 *
 * Validators, formatters, DOM convenience, toast notifications.
 */

'use strict';

/* ============================================================
   ID Generation
   ============================================================ */

/** Generate a short unique id (good enough for localStorage demo). */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/* ============================================================
   Validation
   ============================================================ */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email string.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email).trim());
}

/**
 * Clear all inline validation errors inside a parent element.
 * @param {HTMLElement} parent
 */
function clearValidationErrors(parent) {
  parent.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  parent.querySelectorAll('.is-invalid').forEach(el => {
    el.classList.remove('is-invalid');
  });
}

/**
 * Show an inline validation error next to a field.
 * Expects the field to have a sibling/next-element with class `.form-error`
 * or a `data-error` attribute pointing to the error element id.
 * @param {HTMLElement} field – the input/select element
 * @param {string} message
 */
function showFieldError(field, message) {
  field.classList.add('is-invalid');
  // Try sibling first
  let errEl = field.nextElementSibling;
  if (!errEl || !errEl.classList.contains('form-error')) {
    // Try data-error attribute
    const errId = field.getAttribute('data-error');
    if (errId) errEl = document.getElementById(errId);
  }
  if (errEl && errEl.classList.contains('form-error')) {
    errEl.textContent = message;
    errEl.classList.add('visible');
  }
}

/**
 * Validate a set of rules and show errors.
 * @param {HTMLElement} formEl – parent form or container
 * @param {Array<{field: HTMLElement, rules: Array<{test: function, message: string}>}>} validations
 * @returns {boolean} true if ALL valid
 */
function validateFields(formEl, validations) {
  clearValidationErrors(formEl);
  let valid = true;
  for (const { field, rules } of validations) {
    for (const rule of rules) {
      if (!rule.test(field.value)) {
        showFieldError(field, rule.message);
        valid = false;
        break; // Show first error per field
      }
    }
  }
  return valid;
}

/* ============================================================
   Formatting
   ============================================================ */

/**
 * Format a number as currency (PKR for this demo).
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0 });
}

/**
 * Get user initials (up to 2 characters).
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Capitalise the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* ============================================================
   Toast Notification
   ============================================================ */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration – ms before auto-remove (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span style="font-weight:700">${icons[type] || 'ℹ'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) container.remove();
  }, duration);
}

/* ============================================================
   DOM Helpers
   ============================================================ */

/** Shorthand querySelector */
function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/** Shorthand querySelectorAll returning real Array */
function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

/**
 * Resolve relative page paths for links (handles being in /pages/ or root).
 * @param {string} page – e.g. 'employees.html'
 * @returns {string}
 */
function pagePath(page) {
  const norm = (location.pathname || '').toLowerCase().replace(/\\/g, '/');
  const inPages = norm.includes('/pages/') || norm.endsWith('/pages');
  if (page === 'index.html') return inPages ? '../index.html' : 'index.html';
  return inPages ? page : 'pages/' + page;
}

/* ============================================================
   Announcements System (Stage 4)
   ============================================================ */

/**
 * Post a new announcement (Admin only).
 * @param {string} message
 * @param {object} authorSession
 * @returns {{success: boolean, message: string, announcement?: object}}
 */
function postAnnouncement(message, authorSession) {
  const trimmed = (message || '').trim();
  if (trimmed.length === 0) {
    return { success: false, message: 'Announcement message cannot be empty.' };
  }
  if (!authorSession || authorSession.role !== 'admin') {
    return { success: false, message: 'Only administrators can post announcements.' };
  }

  const newAnn = {
    id: generateId(),
    message: trimmed,
    authorId: authorSession.userId,
    authorName: authorSession.name || 'Admin',
    createdAt: new Date().toISOString(),
  };

  const list = getAnnouncements();
  list.unshift(newAnn);
  setAnnouncements(list);

  return { success: true, message: 'Announcement posted successfully.', announcement: newAnn };
}

/**
 * Delete an announcement (Admin only).
 * @param {string} announcementId
 * @returns {{success: boolean, message: string}}
 */
function deleteAnnouncement(announcementId) {
  let list = getAnnouncements();
  list = list.filter(a => a.id !== announcementId);
  setAnnouncements(list);
  return { success: true, message: 'Announcement deleted.' };
}

/**
 * Get all announcements sorted newest first.
 * @returns {Array<object>}
 */
function getAnnouncementsList() {
  return getAnnouncements().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Format timestamp into friendly relative or date display.
 * @param {string} isoStr
 * @returns {string}
 */
function formatAnnouncementTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatDisplayDate(isoStr.slice(0, 10));
}

/* ============================================================
   Smart Helper (Stage 4)
   ============================================================ */

/**
 * Computes Monday date string 'YYYY-MM-DD' of the current week.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

/**
 * Answer a Smart Helper question using keyword matching and actual data.
 * @param {string} query
 * @param {object} session
 * @returns {string}
 */
function answerSmartHelperQuestion(query, session) {
  if (!query || !query.trim()) {
    return 'Please enter a question.';
  }

  const q = query.toLowerCase().trim();
  const isAdmin = session && session.role === 'admin';

  // ========== ADMIN QUESTIONS ==========
  if (isAdmin) {
    // 1. Employee count
    if (
      q.includes('how many employees') ||
      q.includes('employee count') ||
      q.includes('number of employees') ||
      q.includes('total employees') ||
      (q.includes('employees') && q.includes('how many'))
    ) {
      const employees = getUsers().filter(u => u.role === 'employee');
      if (employees.length === 0) {
        return 'We currently have 0 employees registered. You can add employees from the Employees page.';
      }
      return `We currently have ${employees.length} active employee${employees.length === 1 ? '' : 's'} registered in the organization.`;
    }

    // 2. Who is on leave today
    if (
      q.includes('who is on leave') ||
      q.includes('on leave today') ||
      q.includes('who is absent on leave') ||
      (q.includes('leave') && q.includes('today'))
    ) {
      const today = getTodayDateString();
      const approved = getLeaves().filter(l =>
        l.status === 'approved' &&
        l.startDate <= today &&
        l.endDate >= today
      );
      if (approved.length === 0) {
        return `No employees are on approved leave today (${formatDisplayDate(today)}).`;
      }
      const lines = approved.map(l => `• ${l.employeeName} (${l.department}) — ${l.leaveType} (${formatLeaveDateRange(l.startDate, l.endDate)})`);
      return `Today (${formatDisplayDate(today)}), ${approved.length} employee${approved.length === 1 ? ' is' : 's are'} on approved leave:\n${lines.join('\n')}`;
    }

    // 3. Who was late today
    if (
      q.includes('who was late') ||
      q.includes('who is late') ||
      q.includes('late today') ||
      (q.includes('late') && q.includes('today'))
    ) {
      const today = getTodayDateString();
      const lateRecs = getAttendance().filter(a => a.date === today && (a.status === 'late' || a.wasLate));
      const users = getUsers();
      const userMap = new Map(users.map(u => [u.id, u]));

      if (lateRecs.length === 0) {
        return `No employees were marked late today (${formatDisplayDate(today)}). Everyone who checked in arrived within the grace period.`;
      }
      const lines = lateRecs.map(a => {
        const u = userMap.get(a.userId);
        const name = u ? u.name : 'Unknown';
        const dept = u ? u.department : '—';
        return `• ${name} (${dept}) — checked in at ${formatDisplayTime(a.checkInTime)}`;
      });
      return `Today (${formatDisplayDate(today)}), ${lateRecs.length} employee${lateRecs.length === 1 ? '' : 's'} arrived late:\n${lines.join('\n')}`;
    }

    // Default Admin response
    return "I can answer the following questions based on live company data:\n• How many employees do we have?\n• Who is on leave today?\n• Who was late today?";
  }

  // ========== EMPLOYEE QUESTIONS ==========
  if (!isAdmin && session) {
    // 1. Leave balance
    if (
      q.includes('how many leaves') ||
      q.includes('leaves do i have left') ||
      q.includes('leave balance') ||
      q.includes('remaining leaves') ||
      (q.includes('leaves') && q.includes('left')) ||
      q.includes('remaining quota')
    ) {
      const bal = getEmployeeLeaveBalance(session.userId);
      return `You have ${bal.remainingDays} working day${bal.remainingDays === 1 ? '' : 's'} remaining out of your ${bal.quota}-day annual quota (${bal.approvedDays} approved/used, ${bal.pendingDays} pending approval).`;
    }

    // 2. Was I late today
    if (
      q.includes('was i late') ||
      q.includes('am i late') ||
      (q.includes('late') && q.includes('today'))
    ) {
      const today = getTodayDateString();
      const att = getEmployeeTodayAttendance(session.userId, today);
      if (!att) {
        return `You have not checked in yet today (${formatDisplayDate(today)}). Please check in upon arrival.`;
      }
      if (att.status === 'late' || att.wasLate) {
        return `Yes, you were marked Late today. You checked in at ${formatDisplayTime(att.checkInTime)}, which was past the office start time and grace period.`;
      }
      return `No, you were not late today! You checked in on time at ${formatDisplayTime(att.checkInTime)}.`;
    }

    // 3. Hours worked this week
    if (
      q.includes('hours did i work') ||
      q.includes('hours worked') ||
      q.includes('work this week') ||
      q.includes('hours this week') ||
      (q.includes('hours') && q.includes('week'))
    ) {
      const today = getTodayDateString();
      const startOfWeek = getStartOfWeek();
      const myWeekRecs = getAttendance().filter(a =>
        a.userId === session.userId &&
        a.date >= startOfWeek &&
        a.date <= today
      );
      const completedHours = myWeekRecs.reduce((sum, a) => sum + (Number(a.workHours) || 0), 0);
      const todayRec = myWeekRecs.find(a => a.date === today);

      if (myWeekRecs.length === 0) {
        return `You have 0 hours recorded for this week so far (since Monday, ${formatDisplayDate(startOfWeek)}).`;
      }

      let res = `You have completed ${Math.round(completedHours * 10) / 10} hours of work this week (since Monday, ${formatDisplayDate(startOfWeek)}).`;
      if (todayRec && !todayRec.checkOutTime) {
        res += ' (Your shift today is currently in progress — remember to check out before leaving).';
      }
      return res;
    }

    // Default Employee response
    return "I am your personal HR assistant! Here are the questions I can answer for you:\n• How many leaves do I have left?\n• Was I late today?\n• How many hours did I work this week?";
  }

  return 'Please log in to use the HCM Smart Helper.';
}

/**
 * Initializes and injects the Smart Helper floating chat widget into the page.
 * @param {object} session
 */
function initSmartHelper(session) {
  if (!session || document.getElementById('smart-helper-trigger')) return;

  const isAdmin = session.role === 'admin';
  const roleTitle = isAdmin ? 'Company Overview' : 'Personal Assistant';

  const defaultSuggestions = isAdmin ? [
    'How many employees do we have?',
    'Who is on leave today?',
    'Who was late today?',
  ] : [
    'How many leaves do I have left?',
    'Was I late today?',
    'How many hours did I work this week?',
  ];

  const greeting = isAdmin
    ? `Hello ${session.name}! I am your HCM Admin Assistant. Ask me about your workforce, leaves, or daily attendance.`
    : `Hello ${session.name}! I am your personal HCM Assistant. Ask me about your leave balance, today's lateness, or weekly work hours.`;

  // Create widget DOM
  const widgetHtml = `
    <button class="smart-helper-trigger" id="smart-helper-trigger" aria-label="Open HR Smart Helper">
      <span>💬</span> <span>Ask HCM Helper</span>
    </button>

    <div class="smart-helper-panel hidden" id="smart-helper-panel">
      <div class="smart-helper-header">
        <h3><span>🤖</span> HCM Smart Helper</h3>
        <div class="helper-actions">
          <button id="helper-clear-btn" title="Clear chat history">Clear</button>
          <button id="helper-close-btn" title="Close chat">✕</button>
        </div>
      </div>

      <div class="smart-helper-body" id="helper-chat-body">
        <div class="chat-msg bot">${escapeHtml(greeting)}</div>
        <div class="helper-suggestions" id="helper-suggestions">
          ${defaultSuggestions.map(s => `<button class="helper-chip" onclick="sendSuggestion('${escapeHtml(s)}')">${escapeHtml(s)}</button>`).join('')}
        </div>
      </div>

      <div class="smart-helper-footer">
        <input class="smart-helper-input" id="helper-input" type="text" placeholder="Ask a question..." autocomplete="off">
        <button class="smart-helper-send" id="helper-send-btn">Send</button>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = widgetHtml;
  document.body.appendChild(container);

  const trigger = document.getElementById('smart-helper-trigger');
  const panel   = document.getElementById('smart-helper-panel');
  const closeBtn = document.getElementById('helper-close-btn');
  const clearBtn = document.getElementById('helper-clear-btn');
  const sendBtn  = document.getElementById('helper-send-btn');
  const input    = document.getElementById('helper-input');
  const chatBody = document.getElementById('helper-chat-body');

  trigger.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  clearBtn.addEventListener('click', () => {
    chatBody.innerHTML = `
      <div class="chat-msg bot">${escapeHtml(greeting)}</div>
      <div class="helper-suggestions" id="helper-suggestions">
        ${defaultSuggestions.map(s => `<button class="helper-chip" onclick="sendSuggestion('${escapeHtml(s)}')">${escapeHtml(s)}</button>`).join('')}
      </div>
    `;
  });

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    // Append user message
    appendMessage(text, 'user');
    input.value = '';

    // Generate answer
    const answer = answerSmartHelperQuestion(text, session);
    setTimeout(() => {
      appendMessage(answer, 'bot');
    }, 150);
  }

  function appendMessage(text, type) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    msg.textContent = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSend();
  });

  // Global suggestion handler
  window.sendSuggestion = function(text) {
    input.value = text;
    handleSend();
  };
}

/* ============================================================
   Desktop Cursor Spotlight Tracker
   ============================================================ */

/**
 * Cursor spotlight tracker for desktop hero/header elements.
 * Runs on mousemove with requestAnimationFrame, strictly on desktop pointer devices.
 */
function initCursorSpotlight() {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  document.addEventListener('mousemove', e => {
    const el = e.target && e.target.closest ? e.target.closest('.has-spotlight') : null;
    if (!el) return;
    if (!ticking) {
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ============================================================
   Theme Management (Dark / Light Mode)
   ============================================================ */

const THEME_KEY = 'hcm_theme_pref';

/**
 * Get current stored theme preference or fall back to system preference.
 * @returns {'dark'|'light'}
 */
function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (e) {}
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Apply theme to the document and update UI toggle buttons.
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeButtons(isDark);
}

/**
 * Toggle between dark and light themes, save preference, and update UI.
 * @returns {'dark'|'light'} new theme
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {}
  applyTheme(next);
  return next;
}

/**
 * Update all theme toggle buttons across the page.
 * @param {boolean} isDark
 */
function updateThemeButtons(isDark) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.theme-toggle-btn, .theme-toggle').forEach(btn => {
    const icon = btn.querySelector('.theme-icon');
    const label = btn.querySelector('.theme-mode-text');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (label) label.textContent = isDark ? 'Light' : 'Dark';
    const titleText = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', titleText);
    btn.setAttribute('title', titleText);
  });
}

/**
 * Initialize theme from stored preference or system preference.
 */
function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);

  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        try {
          if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
          }
        } catch (err) {}
      });
    } catch (e) {}
  }
}

// Immediately apply theme to avoid flicker
initTheme();

// Auto-run cursor spotlight and sync buttons on DOM ready
if (typeof document !== 'undefined') {
  const onReady = () => {
    initCursorSpotlight();
    updateThemeButtons(document.documentElement.getAttribute('data-theme') === 'dark');
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
}
