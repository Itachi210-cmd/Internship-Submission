import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getRoleHome, isRouteAllowedForRole } from '../utils/roleUtils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Autofocus on email on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handlePasswordKeyActivity = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await login(email.trim(), password);
      const userRole = data?.user?.role;

      // Extract candidate redirect from location.state or sessionStorage
      const candidatePath =
        location.state?.from?.pathname ||
        sessionStorage.getItem('post_login_redirect') ||
        null;

      // Clear the stored redirect immediately after reading
      sessionStorage.removeItem('post_login_redirect');

      // Determine destination: candidate is used ONLY if permitted for the logged-in role
      let destination;
      if (candidatePath && isRouteAllowedForRole(candidatePath, userRole)) {
        destination = candidatePath;
      } else {
        destination = getRoleHome(userRole);
      }

      // Navigate and wipe history state to prevent redirect leakage
      navigate(destination, { replace: true, state: {} });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
    // Maintain focus on password input
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  };

  return (
    <div className="auth-page">
      <div className="stitch-auth-split-container">
        <div className="stitch-auth-split-card">
          {/* Left Brand Panel (Desktop only) */}
          <div className="stitch-auth-brand-panel">
            {/* Subtle water-blue waves and ambient particles (Handmade inline SVG) */}
            <div className="stitch-auth-brand-bg-decor" aria-hidden="true">
              <svg
                className="stitch-brand-wave-svg"
                viewBox="0 0 500 500"
                preserveAspectRatio="none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="450" cy="80" r="140" fill="rgba(255, 255, 255, 0.08)" />
                <circle cx="50" cy="420" r="160" fill="rgba(255, 255, 255, 0.06)" />
                <path
                  d="M0,280 C150,230 350,330 500,260 L500,500 L0,500 Z"
                  fill="rgba(255, 255, 255, 0.05)"
                />
                <path
                  d="M0,350 C120,320 280,410 500,340 L500,500 L0,500 Z"
                  fill="rgba(255, 255, 255, 0.07)"
                />
              </svg>
            </div>

            <div className="stitch-auth-brand-content">
              {/* Brand Logo & Wordmark */}
              <div className="stitch-brand-header">
                <div className="stitch-brand-logo-pill">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <span className="stitch-brand-wordmark">{'<ShopNest>'}</span>
              </div>

              {/* Welcome text */}
              <div className="stitch-brand-copy">
                <h2 className="stitch-brand-headline">Welcome back</h2>
                <p className="stitch-brand-subheadline">
                  The multi-vendor ecosystem connecting shoppers and independent creators.
                </p>
              </div>

              {/* 3 Benefit Points */}
              <ul className="stitch-benefit-list">
                <li className="stitch-benefit-item">
                  <div className="stitch-benefit-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                  <div className="stitch-benefit-text">
                    <span className="stitch-benefit-title">Shop from many stores</span>
                    <span className="stitch-benefit-desc">Browse multi-vendor collections and check out once.</span>
                  </div>
                </li>

                <li className="stitch-benefit-item">
                  <div className="stitch-benefit-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                  </div>
                  <div className="stitch-benefit-text">
                    <span className="stitch-benefit-title">Track every shipment</span>
                    <span className="stitch-benefit-desc">Independent dispatch updates and delivery tracking per vendor.</span>
                  </div>
                </li>

                <li className="stitch-benefit-item">
                  <div className="stitch-benefit-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <div className="stitch-benefit-text">
                    <span className="stitch-benefit-title">Manage your store</span>
                    <span className="stitch-benefit-desc">Catalog tools, order fulfillment, and transparent payouts.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="stitch-auth-form-panel">
            {/* Header visible on mobile / tablet */}
            <div className="stitch-form-mobile-header">
              <div className="stitch-brand-logo-pill-small">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>
              <span className="stitch-brand-wordmark-mobile">{'<ShopNest>'}</span>
            </div>

            <div className="stitch-form-intro">
              <h1 className="stitch-form-title">Sign In</h1>
              <p className="stitch-form-subtitle">Enter your account credentials to continue</p>
            </div>

            {error && (
              <div className="stitch-auth-error-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="stitch-auth-form" noValidate>
              {/* Email Field with inline icon */}
              <div className="stitch-form-group">
                <label htmlFor="login-email" className="stitch-form-label">
                  Email Address
                </label>
                <div className={`stitch-input-with-icon ${fieldErrors.email ? 'has-error' : ''}`}>
                  <span className="stitch-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    ref={emailInputRef}
                    id="login-email"
                    type="email"
                    className="stitch-form-input stitch-input-padded"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    required
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                </div>
                {fieldErrors.email && (
                  <span className="stitch-field-error" role="alert">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Password Field with inline icon, show/hide toggle & Caps Lock detection */}
              <div className="stitch-form-group">
                <label htmlFor="login-password" className="stitch-form-label">
                  Password
                </label>
                <div className={`stitch-input-with-icon ${fieldErrors.password ? 'has-error' : ''}`}>
                  <span className="stitch-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    ref={passwordInputRef}
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="stitch-form-input stitch-input-padded stitch-input-with-action"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    onKeyDown={handlePasswordKeyActivity}
                    onKeyUp={handlePasswordKeyActivity}
                    required
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="stitch-input-action-btn"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {capsLockActive && (
                  <div className="stitch-caps-warning" role="status">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Caps Lock is ON</span>
                  </div>
                )}
                {fieldErrors.password && (
                  <span className="stitch-field-error" role="alert">
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="stitch-auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="stitch-btn-spinner-wrap">
                    <svg className="stitch-btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <span>Signing in...</span>
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Links below form */}
            <div className="stitch-auth-footer-links">
              <p className="stitch-auth-footer-line">
                New here?{' '}
                <Link to="/register" className="stitch-auth-link">
                  Create an account
                </Link>
              </p>
              <p className="stitch-auth-footer-line">
                Want to sell?{' '}
                <Link to="/register?type=sell" className="stitch-auth-link">
                  Open a store
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
