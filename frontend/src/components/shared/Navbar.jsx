// frontend/src/components/shared/Navbar.jsx
// Role-based navigation bar with user avatar and logout button.
// Hidden on auth pages (LoginPage, RegisterPage, Forgot/Reset Password).

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Pages where the Navbar should NOT appear
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  // Don't render on auth pages
  if (AUTH_PATHS.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to={user.role === 'management' ? '/dashboard' : '/tickets'}
            className="flex items-center gap-2 font-bold text-primary-700 text-lg"
          >
            <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Issue Tracker
          </Link>

          {/* Nav Links */}
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
            {user.role === 'management' ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-primary-700 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/tickets"
                  className="text-gray-600 hover:text-primary-700 transition-colors"
                >
                  All Tickets
                </Link>
              </>
            ) : (
              <Link
                to="/tickets"
                className="text-gray-600 hover:text-primary-700 transition-colors"
              >
                My Issues
              </Link>
            )}
          </div>

          {/* Right side: avatar + logout */}
          <div className="flex items-center gap-3">
            {/* User avatar with initials */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center
                              text-white text-xs font-bold select-none">
                {getInitials(user.name)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-800 leading-tight">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-secondary text-xs py-1.5 px-3"
              title="Log out"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
