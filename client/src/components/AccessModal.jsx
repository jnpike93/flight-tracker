import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Trash2, ShieldCheck, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchAllowedUsers, addAllowedUser, removeAllowedUser } from '../api';

export default function AccessModal({ isOpen, onClose, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAllowedUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to load authorized users list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Please provide a valid Google email address');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await addAllowedUser(newEmail.trim(), newName.trim());
      setSuccess(`Added "${newEmail.trim()}" to authorized users list.`);
      setNewEmail('');
      setNewName('');
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (email) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${email}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await removeAllowedUser(email);
      setSuccess(`Revoked access for "${email}".`);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to remove user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Authorized Users Allowlist</h2>
              <p className="text-xs text-slate-400">Only people on this list can log in with Google</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-950/60 border border-rose-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Add User Form (Admin only) */}
          {currentUser?.isAdmin ? (
            <form onSubmit={handleAddUser} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Grant Access to New User</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="Google email (e.g. pilot@gmail.com)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  required
                />
                <input
                  type="text"
                  placeholder="Name / Note (Optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-md shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Grant Access'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Allowlist management is restricted to administrators. Contact an admin to invite new accounts.</span>
            </div>
          )}

          {/* List of Allowed Users */}
          <div>
            <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Current Authorized Accounts</span>
              <span className="text-[11px] text-slate-500 font-normal font-mono">{users.length} authorized</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="text-center py-6 text-xs text-slate-500">Loading authorized accounts...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">No authorized users yet.</div>
              ) : (
                users.map((u) => {
                  const isSelf = currentUser && currentUser.email?.toLowerCase() === u.email.toLowerCase();
                  const isEnv = u.added_by === '.env';

                  return (
                    <div
                      key={u.email}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-white flex items-center gap-1.5 truncate">
                            <span className="truncate">{u.email}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-medium">
                                You
                              </span>
                            )}
                            {isEnv && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                                .env
                              </span>
                            )}
                          </div>
                          {u.name && u.name !== u.email && (
                            <div className="text-[11px] text-slate-400 truncate">{u.name}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {!isSelf && !isEnv && currentUser?.isAdmin && (
                          <button
                            onClick={() => handleRemoveUser(u.email)}
                            title="Revoke Access"
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isSelf || isEnv) && (
                          <span className="text-[10px] text-slate-500 font-medium">Protected</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/40 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

