// frontend/src/pages/ForgotPasswordPage.jsx
// CampusResolve — Sends a password reset email.
// Always shows the same message to prevent email enumeration.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { validateEmail } from '../utils/validators';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError(validateEmail(e.target.value) || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setMessage(data.message);
    } catch {
      // Always show a safe message — even on network error, don't reveal internals
      setMessage('If an account exists for that email, a reset link has been sent.');
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

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-card-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-brand-text tracking-tight">Reset your password</h1>
          <p className="text-brand-muted text-sm mt-1">We'll send a secure reset link to your email.</p>
        </div>

        <div className="card">
          {message ? (
            /* Success state */
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-brand-text mb-2">Check your inbox</h3>
              <p className="text-sm text-brand-muted mb-6 leading-relaxed">{message}</p>
              <Link
                to="/login"
                className="btn-primary inline-flex"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            /* Email form */
            <>
              <h2 className="text-lg font-semibold text-brand-text mb-5">Enter your email</h2>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="label">Email address</label>
                  <input
                    id="email" type="email" value={email}
                    onChange={handleChange}
                    placeholder="you@college.edu"
                    className={`input-field ${error ? 'input-error' : ''}`}
                  />
                  {error && (
                    <p className="error-text">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !!validateEmail(email)}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending…
                    </>
                  ) : 'Send Reset Link'}
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
