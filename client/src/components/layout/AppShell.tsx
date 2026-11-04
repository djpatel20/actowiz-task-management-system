import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.js';
import { NotificationBell } from '../../features/notifications/NotificationBell.js';
import actowizLogoWhite from '../../assets/actowiz-logo-white.svg';
import actowizLogoColor from '../../assets/actowiz-logo.png';
import {
  LayoutDashboard,
  Kanban,
  FolderKanban,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

export const AppShell: React.FC<{ onSelectTask?: (taskId: string) => void }> = ({ onSelectTask }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Kanban Board', path: '/tasks', icon: Kanban },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    ...(user?.role === 'ADMIN' || user?.role === 'MANAGER'
      ? [{ label: 'Teams', path: '/teams', icon: Building2 }]
      : []),
    ...(user?.role === 'ADMIN'
      ? [{ label: 'Users', path: '/users', icon: Users }]
      : []),
  ];

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-[#4400CE]/20 text-[#C084FC] border-[#4400CE]/40';
      case 'MANAGER':
        return 'bg-[#FF6B00]/20 text-[#FFA048] border-[#FF6B00]/40';
      case 'EMPLOYEE':
        return 'bg-[#10B981]/20 text-[#34D399] border-[#10B981]/40';
      default:
        return 'bg-[#28134C] text-[#94A3B8] border-[#28134C]';
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Desktop Sidebar (240px) */}
      <aside className="hidden md:flex md:w-60 bg-[#120726] text-white flex-col justify-between shrink-0 shadow-acto-lg z-20">
        <div>
          {/* Logo Branding */}
          <div className="h-16 px-4 flex items-center border-b border-[#28134C]/80">
            <img
              src={actowizLogoWhite}
              alt="Actowiz - Appliance of Data & Insights"
              className="h-8 w-auto max-w-[200px] object-contain drop-shadow-sm"
            />
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#4400CE]/30 to-[#290660]/40 text-white font-semibold border-l-2 border-[#FF6B00] shadow-sm'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#1E0D3B]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 duration-200" />
                  <span className="font-sans">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-[#28134C]/80">
          <div className="p-2.5 rounded-lg bg-[#1C0D38]/80 border border-[#28134C] flex items-center justify-between mb-2">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-white truncate font-heading">{user?.name}</div>
              <div className="text-[10px] text-[#94A3B8] truncate">{user?.email}</div>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getRoleBadgeColor(
                user?.role
              )}`}
            >
              {user?.role}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#1E0D3B] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-8 bg-white border-b border-[#E2E8F0] flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#5B616E] hover:text-[#1E1B26] rounded-lg"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center space-x-3">
              <img
                src={actowizLogoColor}
                alt="Actowiz - Appliance of Data & Insights"
                className="h-7 sm:h-8 w-auto object-contain shrink-0"
              />
              <div className="h-5 w-px bg-[#E2E8F0] hidden sm:block"></div>
              <div className="text-xs font-medium text-[#5B616E] hidden sm:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                {user?.team?.name ? (
                  <span>Workspace &bull; <strong className="text-[#1E1B26]">{user.team.name}</strong></span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#4400CE]" />
                    <strong className="text-[#1E1B26]">Actowiz Enterprise Workspace</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell onSelectTask={onSelectTask} />
            <div className="hidden sm:flex items-center space-x-2.5 pl-2 border-l border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4400CE] to-[#290660] text-white font-semibold text-xs flex items-center justify-center shadow-sm">
                {user?.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#1E1B26] leading-none">{user?.name}</span>
                <span className="text-[10px] text-[#5B616E] leading-none mt-1 uppercase font-semibold">{user?.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#120726] text-white p-4 border-b border-[#28134C] space-y-1 animate-slide-down">
            <div className="px-3 py-2 mb-2 border-b border-[#28134C]/60 flex items-center">
              <img
                src={actowizLogoWhite}
                alt="Actowiz"
                className="h-7 w-auto object-contain"
              />
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-gradient-to-r from-[#4400CE]/40 to-[#290660]/50 text-white border-l-2 border-[#FF6B00]'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#1E0D3B]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#EF4444] hover:bg-[#1E0D3B]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Routed Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
