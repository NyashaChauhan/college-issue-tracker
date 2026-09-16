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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
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
