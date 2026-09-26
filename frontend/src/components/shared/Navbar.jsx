// frontend/src/components/shared/Navbar.jsx
// CampusResolve — Role-based navigation bar with active states, mobile menu, and user profile area.
// Hidden on auth pages (Login, Register, Forgot/Reset Password).

import React, { useState } from 'react';
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

// ── CampusResolve Logo Mark ─────────────────────────────────
function LogoMark({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield shape */}
      <path
        d="M16 3L5 7.5V15c0 6.075 4.675 11.765 11 13.25C22.325 26.765 27 21.075 27 15V7.5L16 3z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M16 3L5 7.5V15c0 6.075 4.675 11.765 11 13.25C22.325 26.765 27 21.075 27 15V7.5L16 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M11 15.5l3.5 3.5 6.5-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Nav Link ────────────────────────────────────────────────
function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`relative text-sm font-semibold px-1 py-0.5 transition-colors duration-150 ${
        isActive
          ? 'text-primary-700'
          : 'text-brand-muted hover:text-brand-text'
      }`}
    >
      {children}
      {isActive && (
        <span className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
      )}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Don't render on auth pages
  if (AUTH_PATHS.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  if (!user) return null;

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const isManagement = user.role === 'management';

  return (
    <nav
      className="sticky top-0 z-40 border-b"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 3px 0 rgba(15,118,110,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand ────────────────────────────────────── */}
          <Link
            to={isManagement ? '/dashboard' : '/tickets'}
            className="flex items-center gap-2.5 flex-shrink-0"
          >
            <LogoMark className="w-7 h-7 text-primary-600" />
            <span className="font-bold text-[1.05rem] tracking-tight text-brand-text">
              Campus<span className="text-primary-600">Resolve</span>
            </span>
          </Link>

          {/* ── Desktop Nav Links ────────────────────────── */}
          <div className="hidden sm:flex items-center gap-7 h-16">
            {isManagement ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/tickets">All Issues</NavLink>
              </>
            ) : (
              <NavLink to="/tickets">My Issues</NavLink>
            )}
          </div>

          {/* ── Right Side: User + Logout ────────────────── */}
          <div className="hidden sm:flex items-center gap-3">
            {/* User chip */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center
                            text-white text-xs font-bold select-none flex-shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {getInitials(user.name)}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-brand-text leading-none">{user.name}</p>
                <p className="text-xs text-brand-muted capitalize mt-0.5">{user.role}</p>
              </div>
            </div>

            <div className="w-px h-8 bg-brand-border mx-1" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-muted
                         hover:text-danger transition-colors duration-150 px-2 py-1.5 rounded-lg
                         hover:bg-danger-light"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>

          {/* ── Mobile: Hamburger ────────────────────────── */}
          <button
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg
                        text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="sm:hidden border-t animate-fade-in"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="px-4 py-4 space-y-1">
            {/* User info */}
            <div className="flex items-center gap-3 py-3 mb-2 border-b border-brand-border">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center
                            text-white text-sm font-bold select-none flex-shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {getInitials(user.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-text">{user.name}</p>
                <p className="text-xs text-brand-muted capitalize">{user.role}</p>
              </div>
            </div>

            {/* Mobile nav links */}
            {isManagement ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    location.pathname === '/dashboard'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/tickets"
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    location.pathname === '/tickets'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'
                  }`}
                >
                  All Issues
                </Link>
              </>
            ) : (
              <Link
                to="/tickets"
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  location.pathname === '/tickets'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'
                }`}
              >
                My Issues
              </Link>
            )}

            {/* Mobile logout */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold
                          text-danger hover:bg-danger-light transition-colors mt-2"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
