// frontend/src/pages/ForgotPasswordPage.jsx
// Sends a password reset email.
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
    } catch (err) {
      // Always show a safe message — even on network error, don't reveal internals
      setMessage('If an account exists for that email, a reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 text-sm mt-1">
            Enter your email and we'll send a reset link.
          </p>
        </div>

        <div className="card">
          {message ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700 mb-4">{message}</p>
              <Link to="/login" className="text-primary-600 text-sm font-medium hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input
                  id="email" type="email" value={email}
                  onChange={handleChange}
                  placeholder="you@college.edu"
                  className={`input-field ${error ? 'input-error' : ''}`}
                />
                {error && <p className="error-text">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || !!validateEmail(email)}
                className="btn-primary w-full"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
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
