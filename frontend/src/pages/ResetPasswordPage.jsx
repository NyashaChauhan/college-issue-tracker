// frontend/src/pages/ResetPasswordPage.jsx
// Reads ?token= from URL, submits new password + confirm.
// On success: redirects to /login.

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { validatePassword, validateConfirmPassword } from '../utils/validators';

export default function ResetPasswordPage() {
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const token              = searchParams.get('token');

  const [form,    setForm]    = useState({ password: '', confirmPassword: '' });
  const [errors,  setErrors]  = useState({ password: '', confirmPassword: '', general: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card text-center max-w-md w-full">
          <p className="text-gray-700 mb-4">
            Invalid reset link. Please request a new password reset.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-block">
            Request Reset
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a strong password for your account.</p>
        </div>

        <div className="card">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">{success}</p>
              <p className="text-xs text-gray-400 mt-1">Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errors.general && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="label">New Password *</label>
                <input
                  id="password" name="password" type="password"
                  value={form.password} onChange={handleChange}
                  placeholder="Create a strong password"
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                />

                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p className={form.password.length >= 8 ? 'text-green-600' : ''}>
                    {form.password.length >= 8 ? '✓' : '○'} At least 8 characters
                  </p>
                  <p className={/[A-Z]/.test(form.password) ? 'text-green-600' : ''}>
                    {/[A-Z]/.test(form.password) ? '✓' : '○'} One uppercase letter
                  </p>
                  <p className={/[a-z]/.test(form.password) ? 'text-green-600' : ''}>
                    {/[a-z]/.test(form.password) ? '✓' : '○'} One lowercase letter
                  </p>
                  <p className={/[0-9]/.test(form.password) ? 'text-green-600' : ''}>
                    {/[0-9]/.test(form.password) ? '✓' : '○'} One number
                  </p>
                  <p className={/[^A-Za-z0-9]/.test(form.password) ? 'text-green-600' : ''}>
                    {/[^A-Za-z0-9]/.test(form.password) ? '✓' : '○'} One special character
                  </p>
                  <p className={(!/\s/.test(form.password) && form.password.length > 0) ? 'text-green-600' : ''}>
                    {(!/\s/.test(form.password) && form.password.length > 0) ? '✓' : '○'} No spaces
                  </p>
                </div>

                {errors.password && <p className="error-text">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">Confirm New Password *</label>
                <input
                  id="confirmPassword" name="confirmPassword" type="password"
                  value={form.confirmPassword} onChange={handleChange}
                  placeholder="Repeat your new password"
                  className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
                />
                {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || !!validatePassword(form.password) || !!validateConfirmPassword(form.confirmPassword, form.password)}
                className="btn-primary w-full"
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-primary-600 font-medium hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
