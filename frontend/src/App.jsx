// frontend/src/App.jsx
// Root router with ProtectedRoute, PublicRoute, and role guards.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar            from './components/shared/Navbar';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TicketsPage       from './pages/TicketsPage';
import Dashboard         from './components/dashboard/Dashboard';

// ── Loading spinner ──────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        {/* Brand mark */}
        <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-card-md">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        {/* Spinner */}
        <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-primary-200 border-t-primary-600" />
      </div>
    </div>
  );
}

// ── ProtectedRoute ───────────────────────────────────────────
// Redirects to /login if not authenticated.
// Optionally enforces a role requirement.
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;

  // Management trying to access /tickets → redirect to /dashboard
  if (requiredRole === 'non-management' && user.role === 'management') {
    return <Navigate to="/dashboard" replace />;
  }
  // Non-management trying to access /dashboard → redirect to /tickets
  if (requiredRole === 'management' && user.role !== 'management') {
    return <Navigate to="/tickets" replace />;
  }

  return children;
}

// ── PublicRoute ──────────────────────────────────────────────
// Redirects authenticated users away from auth pages.
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) {
    return <Navigate to={user.role === 'management' ? '/dashboard' : '/tickets'} replace />;
  }

  return children;
}

// ── Inner router (needs useAuth context) ────────────────────
function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Auth pages (public only) */}
        <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        {/* Reset password is public (user clicked link in email, may not be logged in) */}
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Protected: students + faculty */}
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <TicketsPage />
            </ProtectedRoute>
          }
        />

        {/* Protected: management only */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="management">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
