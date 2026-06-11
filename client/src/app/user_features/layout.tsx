'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { getAccessToken, getStoredUser, clearAuthTokens } from '@/lib/tokenStorage';
import {
  LayoutDashboard, FolderKanban, CheckSquare, LogOut,
  BrainCircuit, Bell, Menu, X, BarChart2, User, ChevronRight, Shield
} from 'lucide-react';

type Notification = {
  isRead: boolean;
};

type SearchResult = {
  projects: unknown[];
  tasks: unknown[];
};
import { RootState } from '@/store';
import { logout, setCredentials } from '@/store/slices/authSlice';
import api from '@/lib/axios';

const navItems = [
  { name: 'Dashboard', href: '/user_features/dashboard', icon: LayoutDashboard, exact: true },
  { name: 'Projects', href: '/user_features/projects', icon: FolderKanban, exact: false },
  { name: 'My Tasks', href: '/user_features/tasks', icon: CheckSquare, exact: true },
  { name: 'Analytics', href: '/user_features/analytics', icon: BarChart2, exact: true },
  { name: 'Notifications', href: '/user_features/notifications', icon: Bell, exact: true },
  { name: 'Profile', href: '/user_features/profile', icon: User, exact: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate auth from cookie storage on page load/refresh
  useEffect(() => {
    const token = getAccessToken(false);
    const storedUser = getStoredUser(false);
    if (token && storedUser && !isAuthenticated) {
      dispatch(setCredentials({ user: storedUser, accessToken: token }));
    }
    setTimeout(() => setHydrated(true), 0);
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<Notification[]>('/notifications');
      const unread = res.data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const initialFetchTimeout = window.setTimeout(fetchUnreadCount, 0);
    const interval = window.setInterval(fetchUnreadCount, 30000); // poll every 30s

    return () => {
      window.clearTimeout(initialFetchTimeout);
      window.clearInterval(interval);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const isSearchOpen = searchResults !== null && searchQuery.length >= 2;

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const delay = window.setTimeout(async () => {
        try {
          const res = await api.get<SearchResult>(`/search?q=${searchQuery}`);
          setSearchResults(res.data);
        } catch (error) {
          console.error(error);
        }
      }, 300);
      return () => clearTimeout(delay);
    }
    return undefined;
  }, [searchQuery]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="w-10 h-10 text-purple-400 animate-pulse" />
          <p className="text-gray-600 text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    clearAuthTokens(false);
    dispatch(logout());
    router.push('/login');
  };

  const adminLink = user?.role === 'admin' 
    ? [{ name: 'Admin Console', href: '/admin_features/dashboard', icon: Shield, exact: false }] 
    : [];
    
  const allNavItems = [...navItems, ...adminLink];

  const isActive = (item: typeof navItems[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const pageName = allNavItems.find(n => isActive(n))?.name
    || (pathname.includes('/projects/') ? 'Kanban Board' : 'Dashboard');

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white flex overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.06] z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-purple-400" />
          <span className="font-bold text-sm">SmartTask AI</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/5">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`absolute md:static inset-y-0 left-0 z-40 w-64 bg-[#0e0e0e] border-r border-white/[0.06] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} h-full`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.35)]">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            SmartTask AI
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest px-3 mb-3">Workspace</p>
          {allNavItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            
            // Special styling for Admin link
            const isAdminLink = item.name === 'Admin Console';
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? isAdminLink 
                        ? 'bg-orange-500/10 text-white border border-orange-500/20' 
                        : 'bg-purple-500/10 text-white border border-purple-500/20'
                    : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? (isAdminLink ? 'text-orange-400' : 'text-purple-400') : 'text-gray-600 group-hover:text-gray-400'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.name === 'Notifications' && unreadCount > 0 && (
                    <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {active && <div className={`w-1.5 h-1.5 rounded-full ${isAdminLink ? 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]'}`}></div>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
          <Link href="/profile" onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-2 mb-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate leading-none">{user?.username}</p>
              <p className="text-[11px] text-gray-600 truncate mt-0.5">{user?.email}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm group"
          >
            <LogOut className="w-4 h-4 group-hover:text-red-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 md:px-8 border-b border-white/[0.06] bg-[#0a0a0a]/60 backdrop-blur-md mt-14 md:mt-0 relative z-30">
          <div className="flex items-center gap-2 text-sm hidden md:flex">
            <span className="text-gray-600">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
            <span className="font-semibold text-white">{pageName}</span>
          </div>

          {/* Global Search */}
          <div className="flex-1 max-w-md mx-4 relative">
            <input
              type="text"
              placeholder="Search tasks, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-600"
            />
            {isSearchOpen && searchResults && (
              <div className="absolute top-full mt-2 w-full bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {searchResults.projects.length === 0 && searchResults.tasks.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">No results found</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {searchResults.projects.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-1">Projects</div>
                        {searchResults.projects.map(p => (
                          <Link key={p.id} href={`/user_features/projects/${p.id}`} onClick={() => setIsSearchOpen(false)} className="block px-3 py-2 hover:bg-white/5 rounded-lg transition-colors">
                            <div className="text-sm text-purple-400 font-medium">{p.title}</div>
                            <div className="text-xs text-gray-500 truncate">{p.description}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.tasks.length > 0 && (
                      <div className="p-2 border-t border-white/5">
                        <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-1">Tasks</div>
                        {searchResults.tasks.map(t => (
                          <Link key={t.id} href={`/user_features/projects/${t.projectId}`} onClick={() => setIsSearchOpen(false)} className="block px-3 py-2 hover:bg-white/5 rounded-lg transition-colors">
                            <div className="text-sm font-medium">{t.title}</div>
                            <div className="text-xs text-gray-500">In project: {t.project?.title} • {t.status}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/notifications"
              className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
              )}
            </Link>
            <Link href="/profile" className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-shadow">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-5 md:p-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-purple-500/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          {children}
        </div>
      </div>
    </div>
  );
}
