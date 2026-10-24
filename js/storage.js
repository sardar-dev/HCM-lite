/**
 * HCM-Lite — localStorage Storage Helpers
 * 
 * Centralised read/write wrappers for every data key used in the app.
 * Keys:  hcm_company, hcm_users, hcm_attendance, hcm_leaves, hcm_session
 */

'use strict';

const STORAGE_KEYS = Object.freeze({
  COMPANY:       'hcm_company',
  USERS:         'hcm_users',
  ATTENDANCE:    'hcm_attendance',
  LEAVES:        'hcm_leaves',
  SESSION:       'hcm_session',
  ANNOUNCEMENTS: 'hcm_announcements',
});

/* ---------- Generic helpers ---------- */

/**
 * Read a JSON value from localStorage.
 * @param {string} key
 * @param {*} fallback – returned when key is absent or invalid JSON
 * @returns {*}
 */
function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Write a value as JSON to localStorage.
 * @param {string} key
 * @param {*} value
 */
function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
function storageRemove(key) {
  localStorage.removeItem(key);
}

/* ---------- Domain-specific accessors ---------- */

/** Company profile */
const DEFAULT_COMPANY_SETTINGS = Object.freeze({
  name: 'HCM Lite',
  officeStartTime: '09:00',
  graceMinutes: 15,
  leaveQuota: 20,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
});

function getCompany()         { return storageGet(STORAGE_KEYS.COMPANY, null); }
function setCompany(data)     { storageSet(STORAGE_KEYS.COMPANY, data); }

/** Company profile with guaranteed settings fallbacks */
function getCompanySettings() {
  const company = getCompany() || {};
  return {
    name: company.name || DEFAULT_COMPANY_SETTINGS.name,
    officeStartTime: company.officeStartTime || DEFAULT_COMPANY_SETTINGS.officeStartTime,
    graceMinutes: company.graceMinutes !== undefined ? Number(company.graceMinutes) : DEFAULT_COMPANY_SETTINGS.graceMinutes,
    leaveQuota: company.leaveQuota !== undefined ? Number(company.leaveQuota) : DEFAULT_COMPANY_SETTINGS.leaveQuota,
    workingDays: Array.isArray(company.workingDays) && company.workingDays.length > 0 ? company.workingDays : [...DEFAULT_COMPANY_SETTINGS.workingDays],
    createdAt: company.createdAt || new Date().toISOString(),
  };
}

/** Users array (admin + employees) */
function getUsers()           { return storageGet(STORAGE_KEYS.USERS, []); }
function setUsers(arr)        { storageSet(STORAGE_KEYS.USERS, arr); }

/** Attendance records */
function getAttendance()      { return storageGet(STORAGE_KEYS.ATTENDANCE, []); }
function setAttendance(arr)   { storageSet(STORAGE_KEYS.ATTENDANCE, arr); }

/** Leave requests */
function getLeaves()          { return storageGet(STORAGE_KEYS.LEAVES, []); }
function setLeaves(arr)       { storageSet(STORAGE_KEYS.LEAVES, arr); }

/** Current logged-in session */
function getSession()         { return storageGet(STORAGE_KEYS.SESSION, null); }
function setSession(data)     { storageSet(STORAGE_KEYS.SESSION, data); }
function clearSession()       { storageRemove(STORAGE_KEYS.SESSION); }

/** Announcements array */
function getAnnouncements()   { return storageGet(STORAGE_KEYS.ANNOUNCEMENTS, []); }
function setAnnouncements(arr){ storageSet(STORAGE_KEYS.ANNOUNCEMENTS, arr); }
