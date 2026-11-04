import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.js';
import { NotificationBell } from '../../features/notifications/NotificationBell.js';
import {
  LayoutDashboard,
  Kanban,
  FolderKanban,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
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
        return 'bg-[#5556A6]/20 text-[#5556A6] border-[#5556A6]/30';
      case 'MANAGER':
        return 'bg-[#B9843D]/20 text-[#B9843D] border-[#B9843D]/30';
      case 'EMPLOYEE':
        return 'bg-[#438568]/20 text-[#438568] border-[#438568]/30';
      default:
        return 'bg-[#E5E6E1] text-[#777B76] border-[#E5E6E1]';
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F7F7F4]">
      {/* Desktop Sidebar (240px) */}
      <aside className="hidden md:flex md:w-60 bg-[#202321] text-white flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 px-6 flex items-center space-x-3 border-b border-[#313633]">
            <div className="w-8 h-8 rounded-lg bg-[#5556A6] flex items-center justify-center font-bold text-white text-base">
              A
            </div>
            <div className="font-semibold text-base tracking-tight text-[#F7F7F4]">
              Actowiz
            </div>
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
                    `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#313633] text-white font-semibold'
                        : 'text-[#969A94] hover:text-white hover:bg-[#282B29]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-[#313633]">
          <div className="p-2.5 rounded-lg bg-[#282B29] flex items-center justify-between mb-2">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-[#969A94] truncate">{user?.email}</div>
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
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-[#969A94] hover:text-[#C35D5D] hover:bg-[#282B29] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-8 bg-white border-b border-[#E5E6E1] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#777B76] hover:text-[#252824] rounded-lg"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-xs font-medium text-[#777B76]">
              {user?.team?.name ? (
                <span>Workspace &bull; {user.team.name}</span>
              ) : (
                <span>Global Workspace</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell onSelectTask={onSelectTask} />
            <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-[#E5E6E1]">
              <div className="w-7 h-7 rounded-full bg-[#E5E6E1] text-[#252824] font-semibold text-xs flex items-center justify-center">
                {user?.name.charAt(0)}
              </div>
              <span className="text-xs font-medium text-[#252824]">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#202321] text-white p-4 border-b border-[#313633] space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-[#313633] text-white'
                        : 'text-[#969A94] hover:text-white'
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
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-[#C35D5D]"
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
