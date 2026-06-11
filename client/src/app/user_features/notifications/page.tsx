'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
  Bell, Check, CheckCheck, Loader2, RefreshCw,
  UserCheck, Calendar, Shield, Megaphone, AlertTriangle, Info
} from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Detect notification type from message text
const detectType = (message: string) => {
  const m = message.toLowerCase();
  if (m.includes('[admin]')) return { icon: Megaphone, color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Announcement' };
  if (m.includes('assigned')) return { icon: UserCheck, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Assignment' };
  if (m.includes('due') || m.includes('deadline') || m.includes('overdue')) return { icon: Calendar, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Deadline' };
  if (m.includes('admin') || m.includes('role')) return { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'System' };
  if (m.includes('warning') || m.includes('alert')) return { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Alert' };
  return { icon: Info, color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Info' };
};

type FilterType = 'all' | 'unread' | 'read';

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unread = notifications.filter(n => !n.isRead).length;

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const FILTERS: { label: string; value: FilterType; count: number }[] = [
    { label: 'All', value: 'all', count: notifications.length },
    { label: 'Unread', value: 'unread', count: unread },
    { label: 'Read', value: 'read', count: notifications.length - unread },
  ];

  return (
    <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-gray-400 text-sm mt-1">
            {loading ? 'Loading...' : unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchNotifications} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors bg-white/5 rounded-xl border border-white/10 hover:bg-white/8"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl w-fit border border-white/5">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.value
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${filter === f.value ? 'bg-purple-500/20' : 'bg-white/5'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-1">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-gray-600 text-sm">
            {filter === 'unread' ? "You're all caught up!" : 'Notifications will appear here when tasks are assigned or deadlines approach.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const type = detectType(n.message);
            const Icon = type.icon;
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${n.isRead
                  ? 'bg-white/[0.02] border-white/[0.04] opacity-60 cursor-default'
                  : 'bg-white/5 border-purple-500/20 hover:bg-white/8 cursor-pointer'
                }`}
              >
                {/* Type Icon */}
                <div className={`w-9 h-9 rounded-xl ${type.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${type.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${type.bg} ${type.color}`}>
                      {type.label}
                    </span>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${n.isRead ? 'text-gray-500' : 'text-white'}`}>
                    {n.message.replace('[Admin] ', '')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1.5">{timeAgo(n.createdAt)}</p>
                </div>

                {/* Mark Read Button */}
                {!n.isRead && (
                  <button
                    onClick={e => { e.stopPropagation(); markRead(n.id); }}
                    className="p-1.5 text-gray-600 hover:text-purple-400 transition-colors rounded-lg hover:bg-purple-500/10 flex-shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
