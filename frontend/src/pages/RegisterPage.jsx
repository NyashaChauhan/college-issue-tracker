// frontend/src/pages/RegisterPage.jsx
// CampusResolve — Self-registration for students and faculty only.
// Management role is blocked both client-side and server-side.

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from '../utils/validators';

const DEPARTMENTS = [
  'CSE', 'AIML', 'ISE', 'CSBS', 'EEE', 'ECE', 'Mechanical',
];

const INIT_FORM = {
  name: '', email: '', role: 'student', department: '',
  password: '', confirmPassword: '',
};

// Password strength checklist item
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

export default function RegisterPage() {
  const navigate  = useNavigate();
  const [form,    setForm]    = useState(INIT_FORM);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (name, value) => {
    switch (name) {
      case 'name':            return validateName(value);
      case 'email':           return validateEmail(value);
      case 'password':        return validatePassword(value);
      case 'confirmPassword': return validateConfirmPassword(value, form.password);
      case 'role':            return value ? null : 'Role is required.';
      case 'department':      return value ? null : 'Department is required.';
      default: return null;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    const err = validate(name, value);
    setErrors((prev) => ({ ...prev, [name]: err || '' }));

    if (name === 'password') {
      const cErr = validateConfirmPassword(form.confirmPassword, value);
      setErrors((prev) => ({ ...prev, confirmPassword: cErr || '' }));
    }
  };

  const isValid = () => (
    !validateName(form.name) &&
    !validateEmail(form.email) &&
    !validatePassword(form.password) &&
    !validateConfirmPassword(form.confirmPassword, form.password) &&
    form.role &&
    form.department
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    ['name', 'email', 'password', 'confirmPassword', 'role', 'department'].forEach((f) => {
      const err = validate(f, form[f]);
      if (err) newErrors[f] = err;
    });

    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setLoading(true);
    setErrors({});

    try {
      await api.post('/auth/register', {
        name:       form.name.trim(),
        email:      form.email.trim().toLowerCase(),
        role:       form.role,
        department: form.department,
        password:   form.password,
      });

      setSuccess('Account created! Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setErrors((prev) => ({ ...prev, general: msg }));
    } finally {
      setLoading(false);
    }
  };

  const p = form.password;
  const passwordChecks = [
    { met: p.length >= 8,                      label: 'At least 8 characters' },
    { met: /[A-Z]/.test(p),                    label: 'One uppercase letter' },
    { met: /[a-z]/.test(p),                    label: 'One lowercase letter' },
    { met: /[0-9]/.test(p),                    label: 'One number' },
    { met: /[^A-Za-z0-9]/.test(p),             label: 'One special character' },
    { met: !/\s/.test(p) && p.length > 0,      label: 'No spaces' },
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-brand-text tracking-tight">
            Join <span className="text-primary-600">CampusResolve</span>
          </h1>
          <p className="text-brand-muted text-sm mt-1">For students and faculty only</p>
        </div>

        <div className="card">
          {/* Success */}
          {success && (
            <div className="mb-5 flex items-center gap-2.5 rounded-lg bg-success-light border border-green-200 px-4 py-3">
              <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-success-text font-medium">{success}</p>
            </div>
          )}

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
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="label">Full Name *</label>
              <input
                id="name" name="name" type="text"
                value={form.name} onChange={handleChange}
                placeholder="Your full name"
                className={`input-field ${errors.name ? 'input-error' : ''}`}
              />
              {errors.name && <p className="error-text">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address *</label>
              <input
                id="email" name="email" type="email"
                value={form.email} onChange={handleChange}
                placeholder="you@college.edu"
                className={`input-field ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            {/* Role + Department */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="role" className="label">Role *</label>
                <select
                  id="role" name="role"
                  value={form.role} onChange={handleChange}
                  className={`input-field ${errors.role ? 'input-error' : ''}`}
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
                {errors.role && <p className="error-text">{errors.role}</p>}
              </div>

              <div>
                <label htmlFor="department" className="label">Department *</label>
                <select
                  id="department" name="department"
                  value={form.department} onChange={handleChange}
                  className={`input-field ${errors.department ? 'input-error' : ''}`}
                >
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {errors.department && <p className="error-text">{errors.department}</p>}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password *</label>
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

              {/* Password checklist */}
              {p.length > 0 && (
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {passwordChecks.map((c) => (
                    <PasswordCheck key={c.label} met={c.met} label={c.label} />
                  ))}
                </ul>
              )}

              {errors.password && <p className="error-text mt-2">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="label">Confirm Password *</label>
              <div className="relative">
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword} onChange={handleChange}
                  placeholder="Repeat your password"
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

            <button type="submit" disabled={loading || !isValid()} className="btn-primary w-full mt-2">
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-brand-border text-center">
            <p className="text-sm text-brand-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
