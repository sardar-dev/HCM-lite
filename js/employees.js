/**
 * HCM-Lite — Employees Module
 *
 * CRUD operations, search, department filtering.
 * Adding an employee auto-creates the corresponding Employee login.
 */

'use strict';

/* ============================================================
   Constants
   ============================================================ */

const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'Finance',
  'Human Resources',
  'Operations',
  'Support',
  'Management',
];

/* ============================================================
   Render Employees Table
   ============================================================ */

/**
 * Render the employees table given optional filters.
 * @param {object} opts
 * @param {string} opts.search – search query
 * @param {string} opts.department – department filter ('all' = no filter)
 */
function renderEmployeesTable(opts = {}) {
  const { search = '', department = 'all' } = opts;
  let users = getUsers().filter(u => u.role === 'employee');

  // Filter by department
  if (department && department !== 'all') {
    users = users.filter(u => u.department === department);
  }

  // Filter by search (name or email)
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    users = users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  const tbody = document.getElementById('employees-tbody');
  const emptyState = document.getElementById('employees-empty');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    const countEl = document.getElementById('employee-count');
    if (countEl) countEl.textContent = '0';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  tbody.innerHTML = users.map(u => `
    <tr data-id="${u.id}">
      <td>
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          <div class="sidebar-avatar" style="width:32px;height:32px;font-size:.75rem">${getInitials(u.name)}</div>
          <div>
            <div style="font-weight:550">${escapeHtml(u.name)}</div>
            <div class="text-xs text-muted">${escapeHtml(u.email)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(u.department)}</td>
      <td>${escapeHtml(u.designation)}</td>
      <td>${formatCurrency(u.salary)}</td>
      <td>
        <div style="display:flex;gap:var(--sp-2)">
          <button class="btn btn-ghost btn-icon" title="View Payslip" onclick="window.location.href='payslip.html?userId=${u.id}'">💰</button>
          <button class="btn btn-ghost btn-icon" title="Edit" onclick="openEditEmployee('${u.id}')">✎</button>
          <button class="btn btn-ghost btn-icon" title="Delete" onclick="confirmDeleteEmployee('${u.id}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Update count badge
  const countEl = document.getElementById('employee-count');
  if (countEl) countEl.textContent = users.length;
}

/* ============================================================
   Add Employee
   ============================================================ */

/**
 * Open the Add Employee modal (reset form).
 */
function openAddEmployee() {
  const form = document.getElementById('employee-form');
  if (!form) return;
  form.reset();
  clearValidationErrors(form);
  document.getElementById('employee-modal-title').textContent = 'Add Employee';
  document.getElementById('employee-id').value = '';
  document.getElementById('emp-password-hint').textContent = '';
  openModal('employee-modal');
}

/**
 * Save employee (add or edit).
 */
function saveEmployee() {
  const form = document.getElementById('employee-form');
  const editId = document.getElementById('employee-id').value;
  const isEdit = !!editId;

  const nameField   = form.querySelector('#emp-name');
  const emailField  = form.querySelector('#emp-email');
  const deptField   = form.querySelector('#emp-department');
  const desigField  = form.querySelector('#emp-designation');
  const salaryField = form.querySelector('#emp-salary');
  const passField   = form.querySelector('#emp-password');

  const users = getUsers();
  const emailVal = emailField.value.trim().toLowerCase();

  // Build validation rules
  const validations = [
    {
      field: nameField,
      rules: [{ test: v => v.trim().length > 0, message: 'Name is required.' }],
    },
    {
      field: emailField,
      rules: [
        { test: v => v.trim().length > 0, message: 'Email is required.' },
        { test: v => isValidEmail(v), message: 'Enter a valid email address.' },
        {
          test: () => {
            // Duplicate check (exclude self when editing)
            const dup = users.find(u => u.email === emailVal && u.id !== editId);
            return !dup;
          },
          message: 'An account with this email already exists.',
        },
      ],
    },
    {
      field: deptField,
      rules: [{ test: v => v.trim().length > 0, message: 'Select a department.' }],
    },
    {
      field: desigField,
      rules: [{ test: v => v.trim().length > 0, message: 'Designation is required.' }],
    },
    {
      field: salaryField,
      rules: [
        { test: v => v.trim().length > 0, message: 'Salary is required.' },
        { test: v => Number(v) > 0, message: 'Salary must be greater than zero.' },
      ],
    },
  ];

  // Password required only on add
  if (!isEdit) {
    validations.push({
      field: passField,
      rules: [
        { test: v => v.length >= 4, message: 'Password must be at least 4 characters.' },
      ],
    });
  }

  if (!validateFields(form, validations)) return;

  if (isEdit) {
    // Update existing
    const idx = users.findIndex(u => u.id === editId);
    if (idx === -1) return;
    users[idx].name        = nameField.value.trim();
    users[idx].email       = emailVal;
    users[idx].department  = deptField.value;
    users[idx].designation = desigField.value.trim();
    users[idx].salary      = Number(salaryField.value);
    // Update password only if provided
    if (passField.value.length > 0) {
      users[idx].password = passField.value;
    }
    setUsers(users);
    showToast('Employee updated successfully.', 'success');
  } else {
    // Create new
    const newUser = {
      id: generateId(),
      name: nameField.value.trim(),
      email: emailVal,
      password: passField.value,
      role: 'employee',
      department: deptField.value,
      designation: desigField.value.trim(),
      salary: Number(salaryField.value),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setUsers(users);
    showToast('Employee added successfully.', 'success');
  }

  closeModal('employee-modal');
  renderEmployeesTable(currentFilters());
}

/* ============================================================
   Edit Employee
   ============================================================ */

function openEditEmployee(id) {
  const users = getUsers();
  const user = users.find(u => u.id === id);
  if (!user) return;

  const form = document.getElementById('employee-form');
  form.reset();
  clearValidationErrors(form);

  document.getElementById('employee-modal-title').textContent = 'Edit Employee';
  document.getElementById('employee-id').value = user.id;
  form.querySelector('#emp-name').value        = user.name;
  form.querySelector('#emp-email').value       = user.email;
  form.querySelector('#emp-department').value   = user.department;
  form.querySelector('#emp-designation').value  = user.designation;
  form.querySelector('#emp-salary').value       = user.salary;
  // Password field blank on edit (optional change)
  form.querySelector('#emp-password').value = '';
  document.getElementById('emp-password-hint').textContent = 'Leave blank to keep current password.';

  openModal('employee-modal');
}

/* ============================================================
   Delete Employee
   ============================================================ */

let pendingDeleteId = null;

function confirmDeleteEmployee(id) {
  pendingDeleteId = id;
  const users = getUsers();
  const user = users.find(u => u.id === id);
  if (!user) return;
  document.getElementById('confirm-text').textContent =
    `Are you sure you want to delete ${user.name}? This action cannot be undone.`;
  openModal('confirm-modal');
}

function executeDeleteEmployee() {
  if (!pendingDeleteId) return;
  let users = getUsers();
  users = users.filter(u => u.id !== pendingDeleteId);
  setUsers(users);

  // Also remove related attendance & leave records
  let attendance = getAttendance();
  attendance = attendance.filter(a => a.userId !== pendingDeleteId);
  setAttendance(attendance);

  let leaves = getLeaves();
  leaves = leaves.filter(l => l.userId !== pendingDeleteId);
  setLeaves(leaves);

  pendingDeleteId = null;
  closeModal('confirm-modal');
  renderEmployeesTable(currentFilters());
  showToast('Employee deleted.', 'success');
}

/* ============================================================
   Modal open/close helpers
   ============================================================ */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ============================================================
   Toolbar helpers
   ============================================================ */

function currentFilters() {
  return {
    search: (document.getElementById('emp-search')?.value) || '',
    department: (document.getElementById('emp-dept-filter')?.value) || 'all',
  };
}

/**
 * Populate the department filter dropdown.
 */
function populateDeptFilter() {
  const sel = document.getElementById('emp-dept-filter');
  if (!sel) return;
  sel.innerHTML = '<option value="all">All Departments</option>' +
    DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('');
}
