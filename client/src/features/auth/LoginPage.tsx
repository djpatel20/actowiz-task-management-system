import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import actowizLogoWhite from '../../assets/actowiz-logo-white.svg';
import actowizLogoColor from '../../assets/actowiz-logo.png';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen w-full flex bg-[#F8FAFC]">
      {/* Brand & Showcase Panel (Actowiz Deep Royal Theme) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#120726] via-[#1C0D38] to-[#290660] text-white p-12 flex-col justify-between relative overflow-hidden shadow-2xl">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#4400CE]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#FF6B00]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="mb-10">
            <img
              src={actowizLogoWhite}
              alt="Actowiz - Appliance of Data & Insights"
              className="h-12 w-auto object-contain drop-shadow"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4400CE]/30 border border-[#4400CE]/50 text-xs font-medium text-[#C084FC] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>High-Performance Enterprise Task Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-bold leading-tight text-white mb-4">
            Role-Based Work Management with Real-Time Integrity.
          </h1>
          <p className="text-[#94A3B8] text-sm leading-relaxed max-w-md font-sans">
            Streamlined workflow enforcement with atomic database transitions, optimistic concurrency
            safeguards, and cross-team data isolation.
          </p>
        </div>

        <div className="space-y-4 pt-12 border-t border-[#28134C] relative z-10">
          <div className="flex items-start space-x-3 text-xs text-[#CBD5E1]">
            <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
            <span>Strict server-side RBAC scoping for Admin, Manager, and Employee roles.</span>
          </div>
          <div className="flex items-start space-x-3 text-xs text-[#CBD5E1]">
            <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
            <span>Centralized workflow state machine with mandatory review rejection reasons.</span>
          </div>
          <div className="flex items-start space-x-3 text-xs text-[#CBD5E1]">
            <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
            <span>Socket.IO per-user real-time alerts, magic-byte validated files & CSV exports.</span>
          </div>
        </div>

        <div className="text-xs text-[#94A3B8] relative z-10 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Actowiz Solutions. All rights reserved.</span>
          <span className="text-[11px] font-medium text-[#FF6B00]">actowizsolutions.com</span>
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="max-w-md w-full mx-auto animate-pop-in">
          <div className="mb-8">
            <div className="lg:hidden mb-6">
              <img
                src={actowizLogoColor}
                alt="Actowiz - Appliance of Data & Insights"
                className="h-10 w-auto object-contain"
              />
            </div>
            <h2 className="text-2xl font-heading font-bold text-[#1E1B26]">Sign in to your account</h2>
            <p className="text-sm text-[#5B616E] mt-1 font-sans">
              Enter your corporate credentials to access your workspace.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-sm flex items-center space-x-2 animate-fade-in">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B26] uppercase tracking-wider mb-1.5 font-heading">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@actowiz.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#1E1B26] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1B26] uppercase tracking-wider mb-1.5 font-heading">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#1E1B26] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 shadow-acto-purple active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span className="font-heading">Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
            <p className="text-xs font-semibold text-[#5B616E] uppercase tracking-wider mb-3 font-heading">
              Quick Fill Demo Credentials
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@actowiz.com', 'AdminPass123!')}
                className="text-left p-2.5 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#4400CE] hover:shadow-acto-sm active:scale-[0.98] transition-all"
              >
                <div className="text-xs font-bold text-[#1E1B26] font-heading">Admin</div>
                <div className="text-[11px] text-[#5B616E] truncate">admin@actowiz.com</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('manager.alpha@actowiz.com', 'ManagerPass123!')}
                className="text-left p-2.5 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#FF6B00] hover:shadow-acto-sm active:scale-[0.98] transition-all"
              >
                <div className="text-xs font-bold text-[#1E1B26] font-heading">Manager Alpha</div>
                <div className="text-[11px] text-[#5B616E] truncate">manager.alpha@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('elena@actowiz.com', 'EmployeePass123!')}
                className="text-left p-2.5 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#0071CE] hover:shadow-acto-sm active:scale-[0.98] transition-all"
              >
                <div className="text-xs font-bold text-[#1E1B26] font-heading">Employee Alpha</div>
                <div className="text-[11px] text-[#5B616E] truncate">elena@actowiz.com</div>
              </button>
            </div>

            <div className="mt-4 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#5B616E] leading-relaxed">
              <span className="font-semibold text-[#1E1B26]">Reviewer Note:</span> Demo credentials are strictly for evaluation & testing. Because sessions use secure <code className="text-[#290660] font-mono">HttpOnly</code> cookies, ensure cookies are enabled (or allow third-party cookies if evaluating in an Incognito tab).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
