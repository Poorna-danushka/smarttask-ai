'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { getAccessToken, getStoredUser, clearAuthTokens } from '@/lib/tokenStorage';
import {
  LayoutDashboard, FolderKanban, CheckSquare, LogOut,
  BrainCircuit, Bell, Menu, X, BarChart2, User, ChevronRight, Shield, Search
} from 'lucide-react';

type Notification = { isRead: boolean };
type SearchResult = {
  projects: { id: string; title: string; description: string | null }[];
  tasks: { id: string; title: string; projectId: string; status: string; project?: { title: string } }[];
};

import { RootState } from '@/store';
import { logout, setCredentials } from '@/store/slices/authSlice';
import api from '@/lib/axios';

const navItems = [
  { name: 'Dashboard',     href: '/user_features/dashboard',     icon: LayoutDashboard, exact: true  },
  { name: 'Projects',      href: '/user_features/projects',       icon: FolderKanban,    exact: false },
  { name: 'My Tasks',      href: '/user_features/tasks',          icon: CheckSquare,     exact: true  },
  { name: 'Analytics',     href: '/user_features/analytics',      icon: BarChart2,       exact: true  },
  { name: 'Notifications', href: '/user_features/notifications',  icon: Bell,            exact: true  },
  { name: 'Profile',       href: '/user_features/profile',        icon: User,            exact: true  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const router   = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [hydrated,      setHydrated]      = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);

  /* ── auth rehydration ── */
  useEffect(() => {
    const token      = getAccessToken(false);
    const storedUser = getStoredUser(false);
    if (token && storedUser && !isAuthenticated) {
      dispatch(setCredentials({ user: storedUser, accessToken: token }));
    }
    setTimeout(() => setHydrated(true), 0);
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/login');
  }, [hydrated, isAuthenticated, router]);

  /* ── notifications polling ── */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<Notification[]>('/notifications');
      setUnreadCount(res.data.filter(n => !n.isRead).length);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const t = window.setTimeout(fetchUnreadCount, 0);
    const i = window.setInterval(fetchUnreadCount, 30_000);
    return () => { window.clearTimeout(t); window.clearInterval(i); };
  }, [isAuthenticated, fetchUnreadCount]);

  /* ── close sidebar on nav ── */
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  /* ── escape closes search ── */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  /* ── search debounce ── */
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); return; }
    const t = window.setTimeout(async () => {
      try {
        const res = await api.get<SearchResult>(`/search?q=${searchQuery}`);
        setSearchResults(res.data);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── loading screen ── */
  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="w-10 h-10 text-purple-400 animate-pulse" />
          <p className="text-gray-600 text-sm">Loading workspace…</p>
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

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const pageName =
    allNavItems.find(n => isActive(n))?.name ??
    (pathname.includes('/projects/') ? 'Kanban Board' : 'Dashboard');

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); setSearchResults(null); };

  /* ────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white flex overflow-hidden">

      {/* ══════════════════════════════════════
          MOBILE TOP BAR
      ══════════════════════════════════════ */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 z-50 flex items-center px-3 gap-2
                      bg-[#0d0d0d] border-b border-white/[0.07]">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500
                          flex items-center justify-center shadow-[0_0_14px_rgba(139,92,246,0.4)]">
            <BrainCircuit className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm bg-clip-text text-transparent
                           bg-gradient-to-r from-purple-400 to-blue-400">
            SmartTask AI
          </span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setSearchOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Search"
        >
          <Search className="w-4.5 h-4.5" />
        </button>

        <Link href="/user_features/notifications"
          className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500
                             shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
          )}
        </Link>
      </div>

      {/* ── mobile backdrop ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* ══════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════ */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 md:z-auto
        w-60 flex flex-col flex-shrink-0
        bg-[#0d0d0d] border-r border-white/[0.07]
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* ── logo ── */}
        <div className="h-[60px] flex items-center gap-2.5 px-5 border-b border-white/[0.07] flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500
                          flex items-center justify-center flex-shrink-0
                          shadow-[0_0_14px_rgba(139,92,246,0.4)]">
            <BrainCircuit className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm bg-clip-text text-transparent
                           bg-gradient-to-r from-purple-400 to-blue-400">
            SmartTask AI
          </span>
          <button
            className="ml-auto md:hidden p-1 rounded-lg text-gray-600 hover:text-gray-300
                       hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── nav ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest
                        px-2 mb-3">
            Workspace
          </p>

          {allNavItems.map(item => {
            const active      = isActive(item);
            const isAdmin     = item.name === 'Admin Console';
            const Icon        = item.icon;
            const activeColor = isAdmin ? 'text-orange-400' : 'text-purple-400';
            const activeBg    = isAdmin ? 'bg-orange-500/10' : 'bg-purple-500/10';

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-colors duration-150 group relative
                  ${active
                    ? `${activeBg} ${activeColor}`
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'}
                `}
              >
                {/* active left bar */}
                {active && (
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full
                    ${isAdmin ? 'bg-orange-400' : 'bg-purple-400'}`} />
                )}

                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors
                  ${active ? activeColor : 'text-gray-600 group-hover:text-gray-400'}`} />

                <span className="flex-1 truncate">{item.name}</span>

                {item.name === 'Notifications' && unreadCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white rounded-full
                                   px-1.5 py-0.5 font-bold min-w-[18px] text-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── user footer ── */}
        <div className="border-t border-white/[0.07] p-3 flex-shrink-0">
          <Link
            href="/user_features/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-xl
                       hover:bg-white/[0.05] transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500
                            flex items-center justify-center font-bold text-xs flex-shrink-0
                            shadow-[0_0_10px_rgba(139,92,246,0.3)]">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.username}
              </p>
              <p className="text-[11px] text-gray-600 truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400
                                     transition-colors flex-shrink-0" />
          </Link>

          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                       text-gray-500 hover:text-red-400 hover:bg-red-500/8 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── desktop header ── */}
        <header className="hidden md:flex h-[60px] flex-shrink-0 items-center gap-4 px-6
                           bg-[#0d0d0d]/80 backdrop-blur-md border-b border-white/[0.07] z-30">

          {/* breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <span className="text-gray-600">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
            <span className="font-semibold text-white">{pageName}</span>
          </div>

          {/* search — centred, capped width */}
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                                 text-gray-600 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tasks, projects…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white
                           bg-white/[0.04] border border-white/[0.08]
                           placeholder:text-gray-600
                           focus:outline-none focus:ring-2 focus:ring-purple-500/30
                           focus:border-purple-500/40 transition-all"
              />

              {/* dropdown */}
              {searchOpen && searchResults && (
                <div className="absolute top-full mt-2 w-full bg-[#111] border border-white/10
                                rounded-xl shadow-2xl overflow-hidden z-50">
                  {searchResults.projects.length === 0 && searchResults.tasks.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No results found</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.projects.length > 0 && (
                        <div className="p-2">
                          <p className="text-[10px] font-bold text-gray-600 uppercase
                                        tracking-widest px-2 mb-1">Projects</p>
                          {searchResults.projects.map(p => (
                            <Link key={p.id} href={`/user_features/projects/${p.id}`}
                              onClick={closeSearch}
                              className="block px-3 py-2 hover:bg-white/5 rounded-lg transition-colors">
                              <p className="text-sm text-purple-400 font-medium">{p.title}</p>
                              {p.description && (
                                <p className="text-xs text-gray-500 truncate">{p.description}</p>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.tasks.length > 0 && (
                        <div className="p-2 border-t border-white/[0.06]">
                          <p className="text-[10px] font-bold text-gray-600 uppercase
                                        tracking-widest px-2 mb-1">Tasks</p>
                          {searchResults.tasks.map(t => (
                            <Link key={t.id} href={`/user_features/projects/${t.projectId}`}
                              onClick={closeSearch}
                              className="block px-3 py-2 hover:bg-white/5 rounded-lg transition-colors">
                              <p className="text-sm font-medium text-white">{t.title}</p>
                              <p className="text-xs text-gray-500">
                                {t.project?.title} · {t.status}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link href="/user_features/notifications"
              className="relative p-2 rounded-xl text-gray-400 hover:text-white
                         hover:bg-white/5 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500
                                 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              )}
            </Link>
            <Link href="/user_features/profile"
              className="w-8 h-8 rounded-full ml-1 bg-gradient-to-tr from-purple-500 to-blue-500
                         flex items-center justify-center font-bold text-sm
                         hover:shadow-[0_0_14px_rgba(139,92,246,0.4)] transition-shadow">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </Link>
          </div>
        </header>

        {/* ── mobile search overlay ── */}
        {searchOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col"
               onClick={e => { if (e.target === e.currentTarget) closeSearch(); }}>
            <div className="bg-[#111] border-b border-white/10 p-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                                   text-gray-600 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search tasks, projects…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl
                             text-sm text-white placeholder:text-gray-600
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                />
              </div>
              <button onClick={closeSearch}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
            {searchResults && (
              <div className="flex-1 overflow-y-auto bg-[#0e0e0e]">
                {searchResults.projects.length === 0 && searchResults.tasks.length === 0 ? (
                  <p className="p-6 text-sm text-gray-500 text-center">No results found</p>
                ) : (
                  <>
                    {searchResults.projects.length > 0 && (
                      <div className="p-3">
                        <p className="text-[10px] font-bold text-gray-600 uppercase
                                      tracking-widest px-2 mb-2">Projects</p>
                        {searchResults.projects.map(p => (
                          <Link key={p.id} href={`/user_features/projects/${p.id}`}
                            onClick={closeSearch}
                            className="block px-3 py-3 hover:bg-white/5 rounded-xl transition-colors">
                            <p className="text-sm text-purple-400 font-medium">{p.title}</p>
                            {p.description && (
                              <p className="text-xs text-gray-500 truncate">{p.description}</p>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.tasks.length > 0 && (
                      <div className="p-3 border-t border-white/[0.06]">
                        <p className="text-[10px] font-bold text-gray-600 uppercase
                                      tracking-widest px-2 mb-2">Tasks</p>
                        {searchResults.tasks.map(t => (
                          <Link key={t.id} href={`/user_features/projects/${t.projectId}`}
                            onClick={closeSearch}
                            className="block px-3 py-3 hover:bg-white/5 rounded-xl transition-colors">
                            <p className="text-sm font-medium text-white">{t.title}</p>
                            <p className="text-xs text-gray-500">
                              {t.project?.title} · {t.status}
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── page content ── */}
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
          <div className="relative min-h-full p-4 sm:p-6 md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48
                            bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.06),transparent_70%)]" />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
