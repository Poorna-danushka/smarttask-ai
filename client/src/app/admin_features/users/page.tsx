'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Trash2, Shield, ShieldOff, Loader2,
  UserCheck, UserX, Mail, Calendar, RefreshCw
} from 'lucide-react';
import adminApi from '@/lib/adminAxios';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

type RoleFilter = 'all' | 'admin' | 'user';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (user: User) => {
    setDeleteId(user.id);
    try {
      await adminApi.delete(`/admin/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleteId(null);
    }
  };

  const toggleRole = async (user: User) => {
    setRoleLoading(user.id);
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await adminApi.patch(`/admin/users/${user.id}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Role update failed', err);
    } finally {
      setRoleLoading(null);
    }
  };

  // Export users as CSV
  const exportCSV = () => {
    const header = 'Username,Email,Role,Joined';
    const rows = users.map(u => `${u.username},${u.email},${u.role},${new Date(u.createdAt).toLocaleDateString()}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = users.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const admins = users.filter(u => u.role === 'admin').length;
  const ROLE_TABS: { label: string; value: RoleFilter; count: number }[] = [
    { label: 'All', value: 'all', count: users.length },
    { label: 'Admins', value: 'admin', count: admins },
    { label: 'Users', value: 'user', count: users.length - admins },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-500 text-sm mt-1">
            {users.length} total users · {admins} admin{admins !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            Export CSV
          </button>
          <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl w-fit border border-white/5">
        {ROLE_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setRoleFilter(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              roleFilter === t.value
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${roleFilter === t.value ? 'bg-red-500/20' : 'bg-white/5'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${user.role === 'admin' ? 'bg-gradient-to-tr from-red-500 to-orange-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'bg-gradient-to-tr from-purple-500 to-blue-500'}`}>
                        {user.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-white block">{user.username}</span>
                        <span className="text-xs text-gray-600 md:hidden">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail className="w-3.5 h-3.5 text-gray-600" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold ${user.role === 'admin' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                      {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleRole(user)}
                        disabled={roleLoading === user.id}
                        title={user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        className={`p-2 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 border ${user.role === 'admin' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/20'}`}
                      >
                        {roleLoading === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : user.role === 'admin' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{user.role === 'admin' ? 'Revoke' : 'Make Admin'}</span>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(user)}
                        title="Delete User"
                        className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                      >
                        {deleteId === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-600">
                    <UserX className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0d0f14] border border-red-500/20 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Delete User</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Are you sure you want to delete <strong className="text-white">{confirmDelete.username}</strong>? This will also delete all their projects and tasks. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteId === confirmDelete.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleteId === confirmDelete.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
