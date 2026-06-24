'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { Shield, Mail, Lock, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import api from '@/lib/axios';
import { AxiosError } from 'axios';
import { setAdminCredentials } from '@/store/slices/adminAuthSlice';
import { saveAuthTokens } from '@/lib/tokenStorage';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const dispatch = useDispatch();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { user } = response.data;

      if (user.role !== 'admin') {
        setError('Access denied. This portal is for administrators only.');
        return;
      }

      saveAuthTokens(user, true);
      dispatch(setAdminCredentials({ admin: user }));
      router.push('/admin_features/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to login';
      setError((error as any)?.response?.data?.message || message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0f] relative overflow-hidden p-4 sm:p-6">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[60%] bg-orange-900/15 rounded-full blur-[150px]"></div>
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-red-600 to-orange-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] mb-4 sm:mb-5">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">Admin Portal</h1>
          <p className="text-gray-500 text-xs sm:text-sm">SmartTask AI — Restricted Access</p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          {error && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 placeholder-gray-600 transition-all"
                  placeholder="admin@smarttask.ai"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 placeholder-gray-600 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:shadow-[0_0_35px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Access Admin Panel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-gray-600">
              Not an admin?{' '}
              <a href="/login" className="text-gray-400 hover:text-white transition-colors underline underline-offset-2">
                User Login
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          🔒 All activity in this portal is monitored and logged
        </p>
      </div>
    </div>
  );
}
