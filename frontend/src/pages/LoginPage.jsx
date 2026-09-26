// frontend/src/pages/LoginPage.jsx
// CampusResolve — Email + password login.
// On success: management → /dashboard, others → /tickets.

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { validateEmail, validatePassword } from '../utils/validators';

// ── Campus shield logo mark ──────────────────────────────────
function ShieldMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 3L5 7.5V15c0 6.075 4.675 11.765 11 13.25C22.325 26.765 27 21.075 27 15V7.5L16 3z"
        fill="white"
        fillOpacity="0.25"
      />
      <path
        d="M16 3L5 7.5V15c0 6.075 4.675 11.765 11 13.25C22.325 26.765 27 21.075 27 15V7.5L16 3z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 15.5l3.5 3.5 6.5-7"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [errors,  setErrors]  = useState({ email: '', password: '', general: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'email')    setErrors((prev) => ({ ...prev, email:    validateEmail(value)    || '' }));
    if (name === 'password') setErrors((prev) => ({ ...prev, password: validatePassword(value) || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailErr    = validateEmail(form.email);
    const passwordErr = validatePassword(form.password);

    if (emailErr || passwordErr) {
      setErrors((prev) => ({ ...prev, email: emailErr || '', password: passwordErr || '' }));
      return;
    }

    setLoading(true);
    setErrors((prev) => ({ ...prev, general: '' }));

    try {
      const { data } = await api.post('/auth/login', {
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      });

      login(data.user, data.accessToken);

      if (data.user.role === 'management') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/tickets', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setErrors((prev) => ({ ...prev, general: msg }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-md">

        {/* ── Brand Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-card-lg mb-4">
            <ShieldMark className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-brand-text tracking-tight">
            Campus<span className="text-primary-600">Resolve</span>
          </h1>
          <p className="text-brand-muted text-sm mt-1">AI-powered campus issue management</p>
        </div>

        {/* ── Card ── */}
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-text mb-6">Sign in to your account</h2>

          {/* General error */}
          {errors.general && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-danger-light border border-red-200 px-4 py-3">
              <svg className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-danger">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email" name="email" type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@college.edu"
                className={`input-field ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && (
                <p className="error-text">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="error-text">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-brand-border text-center">
            <p className="text-sm text-brand-muted">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
