'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import Link from 'next/link';
import { User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/axios';
import { AxiosError } from 'axios';
import { setCredentials } from '@/store/slices/authSlice';
import { saveAuthTokens } from '@/lib/tokenStorage';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const dispatch = useDispatch();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { user, accessToken, refreshToken } = response.data;

      saveAuthTokens(accessToken, refreshToken, user, false);
      dispatch(setCredentials({ user, accessToken }));
      
      router.push('/user_features/dashboard');
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const response = axiosError.response?.data as any;
      const validationMessage = response?.errors?.map((err: any) => err.msg).join(' ');
      const message = validationMessage || response?.message || (error instanceof Error ? error.message : 'Failed to register');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] py-12">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(120,119,198,0.15)] relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-[50px]"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-[50px]"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
              Join SmartTask
            </h1>
            <p className="text-gray-400 text-sm">Create an account to supercharge your productivity.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300 ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 ease-in-out placeholder-gray-500"
                  placeholder="cooluser"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 ease-in-out placeholder-gray-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 ease-in-out placeholder-gray-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 group w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-300 shadow-[0_0_20px_rgba(120,119,198,0.3)] hover:shadow-[0_0_30px_rgba(120,119,198,0.5)] flex items-center justify-center gap-2 relative overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
