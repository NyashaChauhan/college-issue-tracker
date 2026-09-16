// frontend/src/pages/RegisterPage.jsx
// Self-registration for students and faculty only.
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
  'CSE',
  'AIML',
  'ISE',
  'CSBS',
  'EEE',
  'ECE',
  'Mechanical',
];

const INIT_FORM = {
  name: '', email: '', role: 'student', department: '',
  password: '', confirmPassword: '',
};

export default function RegisterPage() {
  const navigate  = useNavigate();
  const [form,    setForm]    = useState(INIT_FORM);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

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

    // Re-validate confirmPassword if password changes
    if (name === 'password') {
      const cErr = validateConfirmPassword(form.confirmPassword, value);
      setErrors((prev) => ({ ...prev, confirmPassword: cErr || '' }));
    }
  };

  const isValid = () => {
    return (
      !validateName(form.name) &&
      !validateEmail(form.email) &&
      !validatePassword(form.password) &&
      !validateConfirmPassword(form.confirmPassword, form.password) &&
      form.role &&
      form.department
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Run full validation
    const newErrors = {};
    ['name', 'email', 'password', 'confirmPassword', 'role', 'department'].forEach((f) => {
      const err = validate(f, form[f]);
      if (err) newErrors[f] = err;
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

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

      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setErrors((prev) => ({ ...prev, general: msg }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">For students and faculty only</p>
        </div>

        <div className="card">
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {errors.general && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="label">Confirm Password *</label>
              <input
                id="confirmPassword" name="confirmPassword" type="password"
                value={form.confirmPassword} onChange={handleChange}
                placeholder="Repeat your password"
                className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
              />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading || !isValid()} className="btn-primary w-full mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
