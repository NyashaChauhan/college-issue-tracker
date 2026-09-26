// frontend/src/pages/ResetPasswordPage.jsx
// CampusResolve — Reads ?token= from URL, submits new password + confirm.
// On success: redirects to /login.

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { validatePassword, validateConfirmPassword } from '../utils/validators';

// Password strength checklist item (same as RegisterPage)
function PasswordCheck({ met, label }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-success' : 'text-brand-muted'}`}>
      {met ? (
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-40" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
      {label}
    </li>
  );
}

export default function ResetPasswordPage() {
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const token              = searchParams.get('token');

  const [form,    setForm]    = useState({ password: '', confirmPassword: '' });
  const [errors,  setErrors]  = useState({ password: '', confirmPassword: '', general: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // No token — invalid link
  if (!token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="card text-center max-w-md w-full py-10">
          <div className="w-14 h-14 rounded-full bg-warning-light flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-brand-text mb-2">Invalid reset link</h2>
          <p className="text-sm text-brand-muted mb-6">
            This reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-flex">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setErrors((prev) => ({
        ...prev,
        password:        validatePassword(value) || '',
        confirmPassword: validateConfirmPassword(form.confirmPassword, value) || '',
      }));
    }
    if (name === 'confirmPassword') {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(value, form.password) || '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passErr    = validatePassword(form.password);
    const confirmErr = validateConfirmPassword(form.confirmPassword, form.password);

    if (passErr || confirmErr) {
      setErrors({ password: passErr || '', confirmPassword: confirmErr || '', general: '' });
      return;
    }

    setLoading(true);
    setErrors({ password: '', confirmPassword: '', general: '' });

    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        password: form.password,
      });
      setSuccess(data.message);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. Please request a new link.';
      setErrors((prev) => ({ ...prev, general: msg }));
    } finally {
      setLoading(false);
    }
  };

  const p = form.password;
  const passwordChecks = [
    { met: p.length >= 8,               label: 'At least 8 characters' },
    { met: /[A-Z]/.test(p),             label: 'One uppercase letter' },
    { met: /[a-z]/.test(p),             label: 'One lowercase letter' },
    { met: /[0-9]/.test(p),             label: 'One number' },
    { met: /[^A-Za-z0-9]/.test(p),      label: 'One special character' },
    { met: !/\s/.test(p) && p.length > 0, label: 'No spaces' },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-card-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-brand-text tracking-tight">Set new password</h1>
          <p className="text-brand-muted text-sm mt-1">Choose a strong password for your account.</p>
        </div>

        <div className="card">
          {success ? (
            /* Success state */
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-brand-text mb-2">Password updated!</h3>
              <p className="text-sm text-brand-muted mb-1">{success}</p>
              <p className="text-xs text-brand-muted">Redirecting to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-brand-text mb-5">Create new password</h2>

              {errors.general && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-danger-light border border-red-200 px-4 py-3">
                  <svg className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-danger">{errors.general}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* New Password */}
                <div>
                  <label htmlFor="password" className="label">New Password *</label>
                  <div className="relative">
                    <input
                      id="password" name="password"
                      type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={handleChange}
                      placeholder="Create a strong password"
                      className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                      tabIndex={-1}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showPass
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                        }
                      </svg>
                    </button>
                  </div>

                  {p.length > 0 && (
                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {passwordChecks.map((c) => (
                        <PasswordCheck key={c.label} met={c.met} label={c.label} />
                      ))}
                    </ul>
                  )}

                  {errors.password && <p className="error-text mt-2">{errors.password}</p>}
                </div>

                {/* Confirm */}
                <div>
                  <label htmlFor="confirmPassword" className="label">Confirm New Password *</label>
                  <div className="relative">
                    <input
                      id="confirmPassword" name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword} onChange={handleChange}
                      placeholder="Repeat your new password"
                      className={`input-field pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                      tabIndex={-1}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showConfirm
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                        }
                      </svg>
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !!validatePassword(form.password) || !!validateConfirmPassword(form.confirmPassword, form.password)}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Resetting…
                    </>
                  ) : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-brand-border text-center">
                <Link to="/login" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                  ← Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
