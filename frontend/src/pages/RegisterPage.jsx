import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'sell' ? 'sell' : 'shop';

  // Account Type: 'shop' | 'sell'
  const [accountType, setAccountType] = useState(initialType);

  // Common credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Vendor store details (only if accountType === 'sell')
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');

  // Validation & Submission
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Sync accountType if URL search query changes
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'sell') {
      setAccountType('sell');
    } else if (typeParam === 'shop') {
      setAccountType('shop');
    }
  }, [searchParams]);

  // Autofocus name input on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const handlePasswordKeyActivity = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const validate = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (accountType === 'sell') {
      const trimmedStoreName = storeName.trim();
      if (!trimmedStoreName) {
        errors.storeName = 'Store name is required (3–60 characters).';
      } else if (trimmedStoreName.length < 3 || trimmedStoreName.length > 60) {
        errors.storeName = 'Store name must be between 3 and 60 characters.';
      }

      const trimmedDesc = storeDescription.trim();
      if (trimmedDesc && (trimmedDesc.length < 10 || trimmedDesc.length > 500)) {
        errors.storeDescription = 'Store description must be between 10 and 500 characters.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Register customer account (backend security ensures client never passes a role)
      await register(name.trim(), email.trim(), password);

      // Step 2: If "Shop", redirect directly to home
      if (accountType === 'shop') {
        navigate('/', { replace: true });
        return;
      }

      // Step 3: If "Sell", submit vendor application with active session
      try {
        await api.post('/vendors/apply', {
          storeName: storeName.trim(),
          description: storeDescription.trim(),
        });

        // Application succeeded: redirect to status page with pending indicator
        navigate('/become-seller', {
          replace: true,
          state: { newlyApplied: true },
        });
      } catch (applyErr) {
        // Register succeeded, but vendor application failed (e.g. validation or duplicate store name)
        // Keep account and direct user to Become a Seller page with retry pre-filled
        const errorMsg =
          applyErr.response?.data?.message ||
          applyErr.message ||
          'Vendor store application could not be submitted automatically.';

        navigate('/become-seller', {
          replace: true,
          state: {
            applyFailed: true,
            error: errorMsg,
            storeName: storeName.trim(),
            description: storeDescription.trim(),
          },
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  };

  const toggleConfirmPasswordVisibility = (e) => {
    e.preventDefault();
    setShowConfirmPassword((prev) => !prev);
    if (confirmPasswordInputRef.current) {
      confirmPasswordInputRef.current.focus();
    }
  };

  return (
    <div className="auth-page">
      <div className="stitch-auth-split-container">
        <div className="stitch-auth-split-card">
          {/* Left Brand Panel (Desktop only) */}
          <div className="stitch-auth-brand-panel">
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
                <span className="stitch-brand-wordmark">ShopNest</span>
              </div>

              {/* Welcome text */}
              <div className="stitch-brand-copy">
                <h2 className="stitch-brand-headline">
                  {accountType === 'sell' ? 'Open your store' : 'Join ShopNest'}
                </h2>
                <p className="stitch-brand-subheadline">
                  {accountType === 'sell'
                    ? 'Start selling across independent storefronts with automated payouts.'
                    : 'The multi-vendor ecosystem connecting shoppers and independent creators.'}
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
              <span className="stitch-brand-wordmark-mobile">ShopNest</span>
            </div>

            <div className="stitch-form-intro">
              <h1 className="stitch-form-title">Create an Account</h1>
              <p className="stitch-form-subtitle">Choose your goal to get started with ShopNest</p>
            </div>

            {/* Accessible Two-Option Selector: Shop vs Sell */}
            <div
              className="stitch-type-selector-group"
              role="radiogroup"
              aria-label="Account purpose"
            >
              {/* Option 1: Shop */}
              <button
                type="button"
                role="radio"
                aria-checked={accountType === 'shop'}
                className={`stitch-type-card ${accountType === 'shop' ? 'is-selected' : ''}`}
                onClick={() => setAccountType('shop')}
              >
                <div className="stitch-type-card-indicator" aria-hidden="true">
                  <span className="stitch-type-radio-circle"></span>
                </div>
                <div className="stitch-type-card-body">
                  <div className="stitch-type-card-title-row">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    <span className="stitch-type-card-name">Shop</span>
                  </div>
                  <span className="stitch-type-card-desc">I want to buy products</span>
                </div>
              </button>

              {/* Option 2: Sell */}
              <button
                type="button"
                role="radio"
                aria-checked={accountType === 'sell'}
                className={`stitch-type-card ${accountType === 'sell' ? 'is-selected' : ''}`}
                onClick={() => setAccountType('sell')}
              >
                <div className="stitch-type-card-indicator" aria-hidden="true">
                  <span className="stitch-type-radio-circle"></span>
                </div>
                <div className="stitch-type-card-body">
                  <div className="stitch-type-card-title-row">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span className="stitch-type-card-name">Sell</span>
                  </div>
                  <span className="stitch-type-card-desc">I want to open a store</span>
                </div>
              </button>
            </div>

            {/* Note when Sell is selected */}
            {accountType === 'sell' && (
              <div className="stitch-sell-onboarding-note" role="note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Your account is created first, then an admin reviews your store.</span>
              </div>
            )}

            {serverError && (
              <div className="stitch-auth-error-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="stitch-auth-form" noValidate>
              {/* Full Name */}
              <div className="stitch-form-group">
                <label htmlFor="register-name" className="stitch-form-label">
                  Full Name
                </label>
                <div className={`stitch-input-with-icon ${fieldErrors.name ? 'has-error' : ''}`}>
                  <span className="stitch-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    ref={nameInputRef}
                    id="register-name"
                    type="text"
                    className="stitch-form-input stitch-input-padded"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    required
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.name && (
                  <span className="stitch-field-error" role="alert">
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Email Address */}
              <div className="stitch-form-group">
                <label htmlFor="register-email" className="stitch-form-label">
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
                    id="register-email"
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
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <span className="stitch-field-error" role="alert">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Extra Fields for Sell: Store Name & Store Description */}
              {accountType === 'sell' && (
                <div className="stitch-extra-vendor-fields">
                  <div className="stitch-form-group">
                    <div className="stitch-label-with-counter">
                      <label htmlFor="register-store-name" className="stitch-form-label">
                        Store Name *
                      </label>
                      <span className="stitch-char-counter">{storeName.length}/60</span>
                    </div>
                    <div className={`stitch-input-with-icon ${fieldErrors.storeName ? 'has-error' : ''}`}>
                      <span className="stitch-input-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </span>
                      <input
                        id="register-store-name"
                        type="text"
                        className="stitch-form-input stitch-input-padded"
                        placeholder="e.g. Apex Electronics, Bloom Studio"
                        value={storeName}
                        onChange={(e) => {
                          setStoreName(e.target.value);
                          if (fieldErrors.storeName) setFieldErrors((prev) => ({ ...prev, storeName: '' }));
                        }}
                        maxLength={60}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    {fieldErrors.storeName && (
                      <span className="stitch-field-error" role="alert">
                        {fieldErrors.storeName}
                      </span>
                    )}
                  </div>

                  <div className="stitch-form-group">
                    <div className="stitch-label-with-counter">
                      <label htmlFor="register-store-desc" className="stitch-form-label">
                        Store Description (10–500 chars)
                      </label>
                      <span className="stitch-char-counter">{storeDescription.length}/500</span>
                    </div>
                    <textarea
                      id="register-store-desc"
                      className={`stitch-form-input stitch-form-textarea ${fieldErrors.storeDescription ? 'has-error' : ''}`}
                      rows={3}
                      placeholder="Briefly describe what your store sells and what makes your catalog unique..."
                      value={storeDescription}
                      onChange={(e) => {
                        setStoreDescription(e.target.value);
                        if (fieldErrors.storeDescription) setFieldErrors((prev) => ({ ...prev, storeDescription: '' }));
                      }}
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                    {fieldErrors.storeDescription && (
                      <span className="stitch-field-error" role="alert">
                        {fieldErrors.storeDescription}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="stitch-form-group">
                <label htmlFor="register-password" className="stitch-form-label">
                  Password (min. 8 characters)
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
                    id="register-password"
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
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div className="stitch-form-group">
                <label htmlFor="register-confirm-password" className="stitch-form-label">
                  Confirm Password
                </label>
                <div className={`stitch-input-with-icon ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                  <span className="stitch-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    ref={confirmPasswordInputRef}
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="stitch-form-input stitch-input-padded stitch-input-with-action"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }}
                    onKeyDown={handlePasswordKeyActivity}
                    onKeyUp={handlePasswordKeyActivity}
                    required
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="stitch-input-action-btn"
                    onClick={toggleConfirmPasswordVisibility}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showConfirmPassword ? (
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
                {fieldErrors.confirmPassword && (
                  <span className="stitch-field-error" role="alert">
                    {fieldErrors.confirmPassword}
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
                    <span>
                      {accountType === 'sell' ? 'Creating Store & Account...' : 'Creating Account...'}
                    </span>
                  </span>
                ) : accountType === 'sell' ? (
                  'Create Store & Register'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Links below form */}
            <div className="stitch-auth-footer-links">
              <p className="stitch-auth-footer-line">
                Already have an account?{' '}
                <Link to="/login" className="stitch-auth-link">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
