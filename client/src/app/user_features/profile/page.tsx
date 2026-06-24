'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  User, Mail, Shield, Camera, Check, Loader2,
  Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Calendar, Activity, Zap
} from 'lucide-react';
import { RootState } from '@/store';
import { setCredentials } from '@/store/slices/authSlice';
import api from '@/lib/axios';
import { AxiosError } from 'axios';
import { saveAuthTokens } from '@/lib/tokenStorage';
import { getAvatarUrl } from '@/lib/config';

type DashboardStats = {
  totalTasks?: number;
  totalProjects?: number;
  completedTasks?: number;
  productivity?: number;
};

export default function Profile() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  // Profile form
  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pwError, setPwError] = useState('');

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<DashboardStats>('/dashboard/stats');
        setStats(res.data);
      } catch {}
    };
    fetchStats();
    // Sync avatar from Redux user if it changes (e.g. after login)
    if (user?.avatar) setAvatarUrl(user.avatar);
  }, [user?.avatar]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('idle');
    setSaveError('');
    try {
      const res = await api.patch('/user/profile', { username });
      if (user) {
        const updatedUser = { ...user, username: res.data.user.username, avatar: res.data.user.avatar ?? user.avatar };
        dispatch(setCredentials({ user: updatedUser }));
        saveAuthTokens(updatedUser);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to update profile';
      setSaveStatus('error');
      setSaveError((error as any)?.response?.data?.message || message);
    } finally {
      setSaving(false);
    }
  };

  // Upload profile avatar image
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post('/user/avatar', formData);
      const newAvatarUrl = getAvatarUrl(res.data.user.avatar);
      setAvatarUrl(newAvatarUrl);
      if (user) {
        const updatedUser = { ...user, avatar: res.data.user.avatar };
        dispatch(setCredentials({ user: updatedUser }));
        saveAuthTokens(updatedUser);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Avatar upload failed');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus('idle');
    setPwError('');
    if (newPw !== confirmPw) {
      setPwStatus('error');
      setPwError('New passwords do not match');
      return;
    }
    if (newPw.length < 8) {
      setPwStatus('error');
      setPwError('Password must be at least 8 characters');
      return;
    }
    setChangingPw(true);
    try {
      await api.patch('/user/change-password', { currentPassword: currentPw, newPassword: newPw });
      setPwStatus('success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwStatus('idle'), 3000);
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to change password';
      setPwStatus('error');
      setPwError((error as any)?.response?.data?.message || message);
    } finally {
      setChangingPw(false);
    }
  };

  const pwStrength = () => {
    if (newPw.length === 0) return null;
    if (newPw.length < 6) return { label: 'Too short', color: 'bg-red-500', width: '25%' };
    if (newPw.length < 8) return { label: 'Weak', color: 'bg-orange-500', width: '50%' };
    if (!/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) return { label: 'Medium', color: 'bg-yellow-500', width: '75%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = pwStrength();

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Banner & Profile Header */}
      <div className="relative rounded-3xl overflow-hidden bg-white/[0.02] border border-white/[0.05] shadow-2xl">
        {/* Abstract Banner */}
        <div className="h-32 md:h-48 w-full bg-gradient-to-r from-purple-900/40 via-blue-900/40 to-indigo-900/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/30 rounded-full blur-[80px]"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/30 rounded-full blur-[80px]"></div>
        </div>
        
        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 md:-mt-20">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-tr from-purple-600 to-blue-500 p-1 shadow-[0_0_40px_rgba(139,92,246,0.3)] flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getAvatarUrl(avatarUrl)}
                    alt="Profile avatar"
                    className="w-full h-full rounded-[22px] object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-[22px] bg-[#0a0a0a] flex items-center justify-center text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 to-blue-300">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              {/* Hidden file input triggered by camera button */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-2 right-2 p-3 rounded-xl bg-white text-black hover:bg-gray-200 transition-all shadow-xl hover:scale-110 active:scale-95 z-10 disabled:opacity-60"
              >
                {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{user?.username}</h1>
                  <p className="text-gray-400 mt-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {user?.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-semibold capitalize flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Shield className="w-4 h-4" /> {user?.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              {[
                { label: 'Total Tasks', value: stats.totalTasks, icon: Activity, color: 'text-blue-400' },
                { label: 'Projects', value: stats.totalProjects, icon: User, color: 'text-purple-400' },
                { label: 'Completed', value: stats.completedTasks, icon: CheckCircle2, color: 'text-green-400' },
                { label: 'Productivity', value: `${stats.productivity}%`, icon: Zap, color: 'text-yellow-400' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-black/30 border border-white/5 rounded-2xl p-4 hover:bg-white/[0.02] transition-colors flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-white/5 ${s.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-black">{s.value}</p>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Edit Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-purple-500/10 transition-colors"></div>
            
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" /> Account Settings
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-5 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Email Address</label>
                  <div className="relative opacity-60">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-gray-500" />
                    </div>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/5 rounded-xl text-white cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {saveStatus === 'error' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in zoom-in-95 duration-200">
                  <AlertCircle className="w-5 h-5" />{saveError}
                </div>
              )}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-in zoom-in-95 duration-200">
                  <CheckCircle2 className="w-5 h-5" />Profile updated successfully!
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || username === user?.username}
                  className="px-6 py-3 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus === 'success' ? <Check className="w-4 h-4" /> : null}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
            
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" /> Security
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-5 relative z-10 max-w-md">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Current Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                    placeholder="Enter current password"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                    placeholder="Min 8 characters"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {strength && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} rounded-full transition-all duration-500`} style={{ width: strength.width }}></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3.5 bg-black/50 border rounded-xl text-white focus:outline-none transition-all shadow-inner ${confirmPw && confirmPw !== newPw ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                    placeholder="Confirm new password"
                  />
                </div>
                {confirmPw && confirmPw !== newPw && <p className="text-xs text-red-400 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> Passwords do not match</p>}
              </div>

              {pwStatus === 'error' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in zoom-in-95 duration-200">
                  <AlertCircle className="w-5 h-5" />{pwError}
                </div>
              )}
              {pwStatus === 'success' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-in zoom-in-95 duration-200">
                  <CheckCircle2 className="w-5 h-5" />Password updated!
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPw || !currentPw || !newPw || !confirmPw}
                  className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95"
                >
                  {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {changingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Extras */}
        <div className="space-y-6">
          <div className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" /> Account Status
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Member Since</span>
                <span className="text-white font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> 
                  {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex flex-col gap-1">
                <span className="text-xs font-semibold text-green-500/70 uppercase tracking-wider">Current Status</span>
                <span className="text-green-400 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-pulse"></span>
                  Active & Verified
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex flex-col gap-1">
                <span className="text-xs font-semibold text-orange-500/70 uppercase tracking-wider">Two-Factor Auth</span>
                <div className="flex items-center justify-between">
                  <span className="text-orange-400 font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Not Configured
                  </span>
                  <button className="text-xs font-bold bg-orange-500/20 text-orange-300 px-3 py-1 rounded-lg hover:bg-orange-500/30 transition-colors">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
