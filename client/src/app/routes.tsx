import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.js';
import { AppShell } from '../components/layout/AppShell.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { KanbanBoard } from '../features/kanban/KanbanBoard.js';
import { ProjectsPage } from '../features/projects/ProjectsPage.js';
import { TeamsPage } from '../features/teams/TeamsPage.js';
import { UsersPage } from '../features/users/UsersPage.js';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4] text-xs font-medium text-[#777B76]">
        Initializing workspace session...
      </div>
    );
  }

  const handleSelectTask = (taskId: string) => {
    navigate(`/tasks?selected=${taskId}`);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
      />

      <Route
        path="/"
        element={
          isAuthenticated ? (
            <AppShell onSelectTask={handleSelectTask} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="tasks" element={<KanbanBoard />} />
        <Route path="projects" element={<ProjectsPage />} />

        {/* Manager & Admin Routes */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <Route path="teams" element={<TeamsPage />} />
        )}

        {/* Admin Only Routes */}
        {user?.role === 'ADMIN' && <Route path="users" element={<UsersPage />} />}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
