'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Trash2, Loader2, RefreshCw, Shield, User, Calendar, ShieldAlert, X } from 'lucide-react';
import adminApi from '@/lib/adminAxios';
import { getAvatarUrl } from '@/lib/config';

interface UserType {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string | null;
  createdAt: string;
}

type RoleFilter = 'all' | 'admin' | 'user';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
  user: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [confirmDelete, setConfirmDelete] = useState<UserType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (user: UserType) => {
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

  const handleToggleRole = async (user: UserType) => {
    setUpdatingId(user.id);
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await adminApi.patch(`/admin/users/${user.id}/role`, { role: newRole });
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error('Role update failed', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Stats calculation
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const regularCount = users.filter(u => u.role === 'user').length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newUsersToday = users.filter(
    u => new Date(u.createdAt) >= todayStart
  ).length;

  const ROLE_TABS: { label: string; value: RoleFilter }[] = [
    { label: 'All Users', value: 'all' },
    { label: 'Administrators', value: 'admin' },
    { label: 'Regular Users', value: 'user' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage system permissions, active user accounts, and credentials
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', value: totalUsers, color: 'text-white', icon: Users, iconColor: 'text-blue-400' },
          { label: 'Administrators', value: adminCount, color: 'text-red-400', icon: Shield, iconColor: 'text-red-400' },
          { label: 'Regular Users', value: regularCount, color: 'text-purple-400', icon: User, iconColor: 'text-purple-400' },
          { label: 'New Registrations Today', value: newUsersToday, color: 'text-green-400', icon: Calendar, iconColor: 'text-green-400' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div>
                <p className={`text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
              <div className={`p-3 rounded-xl bg-white/5 ${s.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl w-full md:w-fit border border-white/5 overflow-x-auto scrollbar-none flex-nowrap">
          {ROLE_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setRoleFilter(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                roleFilter === t.value
                  ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm"
          />
        </div>
      </div>

      {/* Users Table / Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <Users className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Date Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* User profile details */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getAvatarUrl(user.avatar)}
                            alt={user.username}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner flex-shrink-0 ${
                            user.role === 'admin' ? 'bg-gradient-to-tr from-red-500 to-orange-400' : 'bg-gradient-to-tr from-purple-500 to-blue-500'
                          }`}>
                            {user.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white leading-none">{user.username}</p>
                          <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold capitalize ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Join Date */}
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Change role action */}
                        <button
                          onClick={() => handleToggleRole(user)}
                          disabled={updatingId === user.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                          {updatingId === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Shield className="w-3 h-3" />
                          )}
                          {user.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>

                        {/* Delete action */}
                        <button
                          onClick={() => setConfirmDelete(user)}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0d0f14] border border-red-500/20 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" /> Confirm Account Deletion
              </h3>
              <button
                onClick={() => setConfirmDelete(null)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-white">"{confirmDelete.username}"</strong> ({confirmDelete.email})?
              <br />
              <span className="text-red-400/80 text-xs mt-2 block font-medium">
                ⚠️ Warning: This will cascade delete all projects owned by this user and all tasks associated with those projects.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteId === confirmDelete.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleteId === confirmDelete.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}