'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import {
  LayoutDashboard, Users, FolderKanban, Activity, BarChart2,
  LogOut, Shield, ChevronRight, Menu, X
} from 'lucide-react';
import { RootState } from '@/store';
import { adminLogout, rehydrateAdmin } from '@/store/slices/adminAuthSlice';
import { getAvatarUrl } from '@/lib/config';

const navItems = [
  { name: 'Overview', href: '/admin_features/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/admin_features/users', icon: Users },
  { name: 'Projects', href: '/admin_features/projects', icon: FolderKanban },
  { name: 'Activity', href: '/admin_features/activity', icon: Activity },
  { name: 'Analytics', href: '/admin_features/analytics', icon: BarChart2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { isAuthenticated, admin } = useSelector((state: RootState) => state.adminAuth);
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Rehydrate admin session from secure cookie storage on every page load/refresh
    dispatch(rehydrateAdmin());
    setTimeout(() => setHydrated(true), 0);
  }, [dispatch]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/admin-login');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center animate-pulse">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-600 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    dispatch(adminLogout());
    router.push('/admin-login');
  };

  const pageName = navItems.find(n => n.href === pathname)?.name || pathname.split('/').pop() || 'Admin';

  return (
    <div className="fixed inset-0 bg-[#080a0f] text-white flex overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#080a0f]/90 backdrop-blur-md border-b border-white/[0.06] z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          <span className="font-bold text-sm">Admin Panel</span>
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
      <aside className={`absolute md:static inset-y-0 left-0 z-40 w-64 bg-[#0c0e13] border-r border-white/[0.06] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} h-full flex-shrink-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.35)]">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Admin Panel</p>
            <p className="text-[10px] text-gray-600 mt-0.5">SmartTask AI</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest px-3 mb-3">Management</p>
          {navItems.map(item => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${isActive
                    ? 'bg-gradient-to-r from-red-500/15 to-orange-500/5 text-white border border-red-500/20'
                    : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-200'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>}
              </Link>
            );
          })}
        </nav>

        {/* Admin User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2 mb-4">
            {admin?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getAvatarUrl(admin.avatar)}
                alt={admin.username}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-500 to-orange-400 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                {admin?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate leading-none">{admin?.username}</p>
              <p className="text-[11px] text-gray-600 truncate mt-0.5">{admin?.email}</p>
            </div>
            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">ADMIN</span>
          </div>
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
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 md:px-8 border-b border-white/[0.06] bg-[#080a0f]/60 backdrop-blur-md mt-14 md:mt-0 relative z-30">
          <div className="flex items-center gap-2 text-sm hidden md:flex">
            <span className="text-gray-600">Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
            <span className="text-white font-medium">{pageName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]"></div>
              <span className="text-xs text-red-400 font-semibold">Admin Mode</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
