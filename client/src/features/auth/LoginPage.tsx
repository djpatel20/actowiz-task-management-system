import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Invalid credentials or connection failed.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F7F7F4]">
      {/* Brand & Editorial Showcase Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#202321] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-[#5556A6] flex items-center justify-center font-bold text-white text-lg">
              A
            </div>
            <span className="font-semibold text-xl tracking-tight text-[#F7F7F4]">Actowiz</span>
          </div>

          <h1 className="text-3xl font-semibold leading-tight text-white mb-4">
            Role-Based Work Management with Real-Time Integrity.
          </h1>
          <p className="text-[#969A94] text-sm leading-relaxed max-w-md">
            Editorial workflow enforcement with atomic database transitions, optimistic concurrency
            safeguards, and cross-team isolation.
          </p>
        </div>

        <div className="space-y-4 pt-12 border-t border-[#313633]">
          <div className="flex items-start space-x-3 text-xs text-[#969A94]">
            <CheckCircle2 className="w-4 h-4 text-[#438568] shrink-0 mt-0.5" />
            <span>Strict server-side RBAC scoping for Admin, Manager, and Employee roles.</span>
          </div>
          <div className="flex items-start space-x-3 text-xs text-[#969A94]">
            <CheckCircle2 className="w-4 h-4 text-[#438568] shrink-0 mt-0.5" />
            <span>Centralized workflow state machine with mandatory review rejection reasons.</span>
          </div>
          <div className="flex items-start space-x-3 text-xs text-[#969A94]">
            <CheckCircle2 className="w-4 h-4 text-[#438568] shrink-0 mt-0.5" />
            <span>Real-time per-user notifications and formula-sanitized CSV exports.</span>
          </div>
        </div>

        <div className="text-xs text-[#777B76]">
          Actowiz Solutions &bull; Internal Task Management System
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <div className="lg:hidden flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#5556A6] flex items-center justify-center font-bold text-white">
                A
              </div>
              <span className="font-semibold text-lg text-[#252824]">Actowiz</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#252824]">Sign in to your account</h2>
            <p className="text-sm text-[#777B76] mt-1">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-[#FDF2F2] border border-[#F8D7DA] text-[#C35D5D] text-sm flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#252824] uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@actowiz.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E6E1] rounded-lg text-sm text-[#252824] placeholder-[#969A94] focus:outline-none focus:ring-1 focus:ring-[#5556A6] focus:border-[#5556A6] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#252824] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E6E1] rounded-lg text-sm text-[#252824] placeholder-[#969A94] focus:outline-none focus:ring-1 focus:ring-[#5556A6] focus:border-[#5556A6] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-[#5556A6] hover:bg-[#45468F] text-white text-sm font-medium rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-[#E5E6E1]">
            <p className="text-xs font-medium text-[#777B76] uppercase tracking-wider mb-3">
              Quick Fill Demo Credentials
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@actowiz.com', 'AdminPass123!')}
                className="text-left p-2.5 bg-white border border-[#E5E6E1] rounded-lg hover:border-[#5556A6] transition-colors"
              >
                <div className="text-xs font-semibold text-[#252824]">Admin</div>
                <div className="text-[11px] text-[#777B76] truncate">admin@actowiz.com</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('manager.alpha@actowiz.com', 'ManagerPass123!')}
                className="text-left p-2.5 bg-white border border-[#E5E6E1] rounded-lg hover:border-[#5556A6] transition-colors"
              >
                <div className="text-xs font-semibold text-[#252824]">Manager Alpha</div>
                <div className="text-[11px] text-[#777B76] truncate">manager.alpha@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('elena@actowiz.com', 'EmployeePass123!')}
                className="text-left p-2.5 bg-white border border-[#E5E6E1] rounded-lg hover:border-[#5556A6] transition-colors"
              >
                <div className="text-xs font-semibold text-[#252824]">Employee Alpha</div>
                <div className="text-[11px] text-[#777B76] truncate">elena@actowiz.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
