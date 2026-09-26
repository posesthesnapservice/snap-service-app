'use client';

import { useState, useEffect } from 'react';
import { 
  getUsersDB, 
  saveUsersDB, 
  toggleUserAccess, 
  UserAccount,
  fetchUsersCloud,
  upsertUserCloud,
  deleteUserCloud,
  getRoleBadgeInfo
} from '@/lib/auth-helpers';
import { 
  getPasswordResets, 
  resolvePasswordReset, 
  PasswordResetRequest,
  fetchPasswordResetsCloud 
} from '@/lib/password-reset-helpers';
import { UserRole } from '@/lib/types';

// SVG Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

function formatLastLogin(isoString?: string): string {
  if (!isoString) return 'Never logged in';
  const date = new Date(isoString);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return '🟢 Just now';
  if (diffMinutes < 60) return `🟢 ${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [resets, setResets] = useState<PasswordResetRequest[]>([]);
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);
  const [activeResetReqId, setActiveResetReqId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Instant local load
    setUsers(getUsersDB());
    setResets(getPasswordResets());

    // 2. Cloud sync for cross-device consistency (PC <-> Mobile)
    fetchUsersCloud().then(cloudUsers => {
      if (cloudUsers && cloudUsers.length > 0) setUsers(cloudUsers);
    });
    fetchPasswordResetsCloud().then(cloudResets => {
      if (cloudResets && cloudResets.length > 0) setResets(cloudResets);
    });
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', username: '', password: '', role: 'photographer' as UserRole });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const toggleStatus = (id: string) => {
    const updated = toggleUserAccess(id);
    setUsers(updated);
  };

  const deleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this user? This will revoke their session.')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      saveUsersDB(updated);
      deleteUserCloud(id);
    }
  };

  const handleAddOrUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) return;

    // Minimum password security check if changing or adding
    if (newUser.password.trim() && newUser.password.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }

    let updated: UserAccount[];
    if (editingUserId) {
      // Update
      let changedUser: UserAccount | undefined;
      updated = users.map(u => {
        if (u.id === editingUserId) {
          changedUser = {
            ...u,
            name: newUser.name.trim(),
            email: newUser.email.trim(),
            username: newUser.username.trim() || undefined,
            role: newUser.role,
            ...(newUser.password.trim() ? { password: newUser.password.trim() } : {})
          };
          return changedUser;
        }
        return u;
      });
      if (changedUser) upsertUserCloud(changedUser);
    } else {
      // Add
      const created: UserAccount = {
        id: `u_${Date.now()}`,
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        username: newUser.username.trim() || undefined,
        password: newUser.password.trim() || 'password123',
        role: newUser.role,
        active: true,
        created_at: new Date().toISOString()
      };
      updated = [...users, created];
      upsertUserCloud(created);
    }

    setUsers(updated);
    saveUsersDB(updated);

    // ONLY mark password reset request resolved once Admin actually saves changes!
    if (activeResetReqId) {
      const updatedResets = resolvePasswordReset(activeResetReqId);
      setResets(updatedResets);
      setActiveResetReqId(null);
    }

    // Reset Form
    setShowModal(false);
    setEditingUserId(null);
    setNewUser({ name: '', email: '', username: '', password: '', role: 'user' });
  };

  const startEdit = (user: UserAccount) => {
    setEditingUserId(user.id);
    setNewUser({
      name: user.name,
      email: user.email,
      username: user.username || '',
      password: '', // blank by default in edit mode unless updated
      role: user.role
    });
    setShowModal(true);
  };

  const handleOpenResetAction = (req: PasswordResetRequest) => {
    setActiveResetReqId(req.id);
    const targetUser = users.find(u => u.email.toLowerCase() === req.email.toLowerCase());
    if (targetUser) {
      startEdit(targetUser);
    } else {
      setNewUser({ name: req.email.split('@')[0], email: req.email, username: req.email.split('@')[0], password: 'password123', role: 'user' });
      setEditingUserId(null);
      setShowModal(true);
    }
  };

  const handleManualDismissReset = (id: string) => {
    const updatedResets = resolvePasswordReset(id);
    setResets(updatedResets);
  };

  const openAddModal = () => {
    setEditingUserId(null);
    setActiveResetReqId(null);
    setNewUser({ name: '', email: '', username: '', password: '', role: 'user' });
    setShowModal(true);
  };

  const pendingResets = resets.filter(r => r.status === 'pending');

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User & Password Management</h1>
          <p style={styles.subtitle}>Control administrative access, assign user passwords, and manage reset requests</p>
        </div>
        <button onClick={openAddModal} style={styles.addBtn}>
          <PlusIcon /> Add User Account
        </button>
      </div>

      {/* Password Reset Requests Card (if any pending) */}
      {pendingResets.length > 0 && (
        <div style={{ ...styles.card, marginBottom: '24px', border: '1px solid rgba(212,175,55,0.4)', background: 'linear-gradient(135deg, #1c180a 0%, #12121a 100%)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '15px', color: '#D4AF37', fontWeight: 'bold' }}>
              🔑 Pending Password Reset Requests ({pendingResets.length})
            </h2>
            <span style={{ fontSize: '11px', color: '#aaa' }}>Stays active until password is saved or dismissed</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingResets.map(req => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0f', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>{req.email}</span>
                  {req.note && <span style={{ color: '#aaa', fontSize: '12px', marginLeft: '12px', fontStyle: 'italic' }}>&quot;{req.note}&quot;</span>}
                  <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>{new Date(req.requested_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleOpenResetAction(req)}
                    style={{ background: '#D4AF37', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Assign New Password
                  </button>
                  <button 
                    onClick={() => handleManualDismissReset(req.id)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
                    title="Dismiss Notification"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table Card */}
      <div style={styles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Username</th>
                <th style={styles.th}>Email Address</th>
                <th style={styles.th}>Assigned Password</th>
                <th style={styles.th}>Role Permission</th>
                <th style={styles.th}>Last Login</th>
                <th style={styles.th}>Created Date</th>
                <th style={styles.th}>Access Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={styles.tbodyRow}>
                  <td style={{ ...styles.td, fontWeight: '600', color: '#fff' }}>{user.name}</td>
                  <td style={styles.td}>
                    <span style={{ fontFamily: 'monospace', color: '#D4AF37', background: 'rgba(212,175,55,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      @{user.username || user.email.split('@')[0]}
                    </span>
                  </td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#D4AF37' }}>
                        {showPasswordId === user.id ? user.password || 'password123' : '••••••••'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowPasswordId(showPasswordId === user.id ? null : user.id)}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: '2px 4px' }}
                        title={showPasswordId === user.id ? 'Hide Password' : 'Show Password'}
                      >
                        {showPasswordId === user.id ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {(() => {
                      const badge = getRoleBadgeInfo(user.role);
                      return (
                        <span 
                          style={{ 
                            ...styles.roleBadge,
                            color: badge.color,
                            backgroundColor: badge.bg,
                            borderColor: badge.border
                          }}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontSize: '12px', color: user.last_login_at ? '#10b981' : '#666', fontWeight: user.last_login_at ? '500' : 'normal' }}>
                      {formatLastLogin(user.last_login_at)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(user.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td style={styles.td}>
                    <button 
                      onClick={() => toggleStatus(user.id)}
                      style={{
                        ...styles.statusBtn,
                        color: user.active ? '#10b981' : '#ef4444',
                        background: user.active ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        borderColor: user.active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      }}
                    >
                      {user.active ? 'ACTIVE' : 'INACTIVE (OFF)'}
                    </button>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={styles.actionGroup}>
                      <button onClick={() => startEdit(user)} style={styles.actionBtnBlue} title="Change Password / Edit User">
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)} 
                        style={styles.actionBtnRed} 
                        disabled={user.email === 'admin@snapservice.com'} 
                        title={user.email === 'admin@snapservice.com' ? 'Cannot delete primary admin' : 'Delete user'}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Overlay */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingUserId ? 'Edit User & Change Password' : 'Create User Account'}
              </h2>
              <button onClick={() => { setShowModal(false); setActiveResetReqId(null); }} style={styles.closeBtn}>
                <XIcon />
              </button>
            </div>
            
            <form onSubmit={handleAddOrUpdateUser} style={styles.modalForm}>
              <div>
                <label style={styles.fieldLabel}>Display Name</label>
                <input 
                  type="text" 
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Ahmed Khan" 
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>Email Address</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g. ahmed@snapservice.com" 
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>Login Username (Easy Sign-In)</label>
                <input 
                  type="text" 
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="e.g. ahmed or photo" 
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>
                  {editingUserId ? 'Assign New Password (leave blank to keep current)' : 'Assigned Password'}
                </label>
                <input 
                  type="text" 
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder={editingUserId ? "Type new password to update..." : "Assign password e.g. photo123"} 
                  style={styles.input}
                  required={!editingUserId}
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>Permission Role</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  style={styles.select}
                >
                  <option value="photographer">Photographer (Photo Only)</option>
                  <option value="cinematographer">Cinematographer (Video Only)</option>
                  <option value="all_rounder">Lead / All-Rounder (Photo + Video)</option>
                  <option value="admin">System Administrator (Admin)</option>
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setActiveResetReqId(null); }} 
                  style={styles.modalCancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.modalSaveBtn}>
                  {editingUserId ? 'Save Password & User Changes' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#aaa',
    margin: '4px 0 0 0',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    color: '#000',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  card: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    textAlign: 'left',
  },
  theadRow: {
    backgroundColor: '#0d0d14',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  th: {
    padding: '14px 16px',
    color: '#aaa',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  tbodyRow: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '14px 16px',
    verticalAlign: 'middle',
    color: '#aaa',
  },
  roleBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid',
  },
  statusBtn: {
    border: '1px solid',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    outline: 'none',
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  actionBtnBlue: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  actionBtnRed: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modalCard: {
    backgroundColor: '#111118',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '420px',
    boxSizing: 'border-box',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#aaa',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    backgroundColor: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '9px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    height: '38px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '16px',
  },
  modalCancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#aaa',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalSaveBtn: {
    backgroundColor: '#D4AF37',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
};
