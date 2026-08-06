import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: { email: string; name: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Login failed. Check credentials.');
        setLoading(false);
        return;
      }
      localStorage.setItem('i35_session_token', data.token);
      localStorage.setItem('i35_session_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch {
      setError('Cannot reach server. Check connection.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-black text-ink">i35 ERP</h1>
            <p className="mt-1 text-xs font-semibold text-faint">Apple Repair Service — Staff Login</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-ink">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-line-strong bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-ink">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line-strong bg-white py-2.5 pl-10 pr-10 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-bold text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-black text-white transition hover:bg-[#0077ED] active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs font-semibold text-muted">
            i35 Apple Service · v2.4.0 · Authorized staff only
          </p>
        </div>
      </div>
    </div>
  );
};
