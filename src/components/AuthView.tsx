import React, { useState } from 'react';
import {
  HardDrive,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Layers,
  CloudLightning,
} from 'lucide-react';
import { User } from '../types';

interface AuthViewProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setIsLogin(true);
    setEmail('alex.cloud@example.com');
    setPassword('Password123!');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Brand Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-sky-400 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30 mb-4">
          <HardDrive className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          DrivePool Hub
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
          Unified Google Drive Storage Pooling with AES-256 Encrypted Persistence & Zero-Disk Streaming.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-white/10 mb-6">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isLogin
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                !isLogin
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
              <span className="font-semibold">Error:</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-name-input"
                    type="text"
                    required
                    placeholder="Alex Cloud"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="alex.cloud@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <button
              id="auth-demo-quick-btn"
              type="button"
              onClick={handleQuickDemoFill}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Fill Seed Demo Account (alex.cloud@example.com)</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-[11px] text-slate-400">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <span className="font-semibold text-slate-200 block">AES-256 Vault</span>
            <span>Tokens Encrypted</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <CloudLightning className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <span className="font-semibold text-slate-200 block">Zero-Disk</span>
            <span>Direct Streaming</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <Layers className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <span className="font-semibold text-slate-200 block">Multi-Drive</span>
            <span>Unified Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
