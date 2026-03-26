import { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import styles from './UsersPage.module.css';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'editor' };

export default function UsersPage() {
  const { apiFetch } = useApi();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'editor', password: '' });
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadError('');
    try {
      const res = await apiFetch('/api/users');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (err) {
      setLoadError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* --- Add user --- */
  function handleAddChange(e) {
    const { name, value } = e.target;
    setAddForm((f) => ({ ...f, [name]: value }));
    setAddError('');
    setAddSuccess('');
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!addForm.email || !addForm.password) {
      setAddError('Email and password are required.');
      return;
    }
    setAddBusy(true);
    setAddError('');
    setAddSuccess('');
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(addForm),
      });
      if (res.status === 409) {
        setAddError('A user with that email already exists.');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create user');
      }
      setAddSuccess(`User "${addForm.email}" created successfully.`);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      await loadUsers();
    } catch (err) {
      setAddError(err.message || 'Failed to create user');
    } finally {
      setAddBusy(false);
    }
  }

  /* --- Edit user --- */
  function startEdit(u) {
    setEditId(u.id);
    setEditForm({ name: u.name || '', role: u.role || 'editor', password: '' });
    setEditError('');
    setDeleteId(null);
  }

  function cancelEdit() {
    setEditId(null);
    setEditError('');
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
    setEditError('');
  }

  async function handleEditSave(userId) {
    setEditBusy(true);
    setEditError('');
    try {
      const payload = { name: editForm.name, role: editForm.role };
      if (editForm.password) payload.password = editForm.password;
      const res = await apiFetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update user');
      }
      setEditId(null);
      await loadUsers();
    } catch (err) {
      setEditError(err.message || 'Failed to update user');
    } finally {
      setEditBusy(false);
    }
  }

  /* --- Delete user --- */
  async function handleDelete(userId) {
    if (deleteId !== userId) {
      setDeleteId(userId);
      setEditId(null);
      return;
    }
    setDeleteBusy(true);
    try {
      const res = await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      setDeleteId(null);
      await loadUsers();
    } catch {
      // ignore
    } finally {
      setDeleteBusy(false);
    }
  }

  const isSelf = (u) => u.id === currentUser?.id || u.email === currentUser?.email;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Users</h1>
          <p className={styles.pageSubtitle}>Manage admin access and roles.</p>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => {
            setShowAddForm((v) => !v);
            setAddError('');
            setAddSuccess('');
            setAddForm(EMPTY_FORM);
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Success message (persists after form closes) */}
      {addSuccess && (
        <div className={styles.successMsg}>{addSuccess}</div>
      )}

      {/* Add user form */}
      {showAddForm && (
        <form className={styles.addForm} onSubmit={handleAddSubmit} noValidate>
          <div className={styles.formTitle}>New User</div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Name</label>
              <input
                className={styles.fieldInput}
                type="text"
                name="name"
                value={addForm.name}
                onChange={handleAddChange}
                placeholder="Full name"
                autoComplete="off"
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Email <span className={styles.required}>*</span></label>
              <input
                className={styles.fieldInput}
                type="email"
                name="email"
                value={addForm.email}
                onChange={handleAddChange}
                placeholder="user@example.com"
                autoComplete="off"
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Password <span className={styles.required}>*</span></label>
              <input
                className={styles.fieldInput}
                type="password"
                name="password"
                value={addForm.password}
                onChange={handleAddChange}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Role</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="role"
                    value="editor"
                    checked={addForm.role === 'editor'}
                    onChange={handleAddChange}
                  />
                  Editor
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={addForm.role === 'admin'}
                    onChange={handleAddChange}
                  />
                  Admin
                </label>
              </div>
            </div>
          </div>

          {addError && <div className={styles.errorMsg}>{addError}</div>}

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.createBtn}
              disabled={addBusy}
            >
              {addBusy ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      )}

      {/* User list */}
      {loading ? (
        <div className={styles.loadingMsg}>Loading users…</div>
      ) : loadError ? (
        <div className={styles.errorMsg}>{loadError}</div>
      ) : users.length === 0 ? (
        <div className={styles.emptyState}>No users found.</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <div className={styles.colName}>Name</div>
            <div className={styles.colEmail}>Email</div>
            <div className={styles.colRole}>Role</div>
            <div className={styles.colDate}>Joined</div>
            <div className={styles.colActions}>Actions</div>
          </div>

          {users.map((u) => (
            <div key={u.id} className={styles.tableRow}>
              {editId === u.id ? (
                /* Inline edit row */
                <div className={styles.editRow}>
                  <div className={styles.editFields}>
                    <input
                      className={styles.editInput}
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                      placeholder="Full name"
                    />
                    <select
                      className={styles.editSelect}
                      name="role"
                      value={editForm.role}
                      onChange={handleEditChange}
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <input
                      className={styles.editInput}
                      type="password"
                      name="password"
                      value={editForm.password}
                      onChange={handleEditChange}
                      placeholder="New password (optional)"
                      autoComplete="new-password"
                    />
                  </div>
                  {editError && <div className={styles.editError}>{editError}</div>}
                  <div className={styles.editActions}>
                    <button
                      className={styles.saveBtn}
                      onClick={() => handleEditSave(u.id)}
                      disabled={editBusy}
                    >
                      {editBusy ? 'Saving…' : 'Save'}
                    </button>
                    <button className={styles.cancelEditBtn} onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal row */
                <>
                  <div className={styles.colName}>
                    <span className={styles.userName}>{u.name || '—'}</span>
                    {isSelf(u) && <span className={styles.youBadge}>you</span>}
                  </div>
                  <div className={`${styles.colEmail} ${styles.userEmail}`}>{u.email}</div>
                  <div className={styles.colRole}>
                    <span className={`${styles.roleBadge} ${u.role === 'admin' ? styles.roleAdmin : styles.roleEditor}`}>
                      {u.role === 'admin' ? 'Admin' : 'Editor'}
                    </span>
                  </div>
                  <div className={`${styles.colDate} ${styles.dateText}`}>
                    {formatDate(u.created_at)}
                  </div>
                  <div className={styles.colActions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => startEdit(u)}
                    >
                      Edit
                    </button>

                    {deleteId === u.id ? (
                      <div className={styles.deleteConfirmInline}>
                        <span className={styles.deleteConfirmText}>Delete?</span>
                        <button
                          className={styles.deleteYesBtn}
                          onClick={() => handleDelete(u.id)}
                          disabled={deleteBusy}
                        >
                          Yes
                        </button>
                        <button
                          className={styles.deleteNoBtn}
                          onClick={() => setDeleteId(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(u.id)}
                        disabled={isSelf(u)}
                        title={isSelf(u) ? 'You cannot delete your own account' : 'Delete user'}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
