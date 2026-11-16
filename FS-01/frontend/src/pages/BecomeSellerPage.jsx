import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

export default function BecomeSellerPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState(location.state?.storeName || '');
  const [description, setDescription] = useState(location.state?.description || '');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(
    location.state?.applyFailed
      ? location.state.error || 'Your account was created, but store application submission failed. You can complete it below.'
      : ''
  );
  const [successMsg, setSuccessMsg] = useState(
    location.state?.newlyApplied
      ? 'Application pending, we will notify you after admin approval.'
      : ''
  );

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendors/me');
      setVendorProfile(response.data?.vendor);
    } catch (err) {
      console.error('Error fetching vendor profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setError('');
    setSuccessMsg('');

    if (!storeName.trim()) {
      setError('Store name is required (3–60 characters).');
      return;
    }
    if (storeName.trim().length < 3 || storeName.trim().length > 60) {
      setError('Store name must be between 3 and 60 characters.');
      return;
    }
    if (description.trim() && (description.trim().length < 10 || description.trim().length > 500)) {
      setError('Store description must be between 10 and 500 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/vendors/apply', {
        storeName: storeName.trim(),
        description: description.trim(),
        logoUrl: logoUrl.trim(),
      });
      setSuccessMsg('Application pending, we will notify you after admin approval.');
      setVendorProfile(response.data?.vendor);
    } catch (err) {
      setError(err.message || 'Failed to submit vendor application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="stitch-onboarding-container">
        <div className="stitch-onboarding-unauth-card">
          <div className="stitch-onboarding-unauth-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7.5" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
          <h2 className="stitch-onboarding-unauth-title">Become a ShopNest Seller</h2>
          <p className="stitch-onboarding-unauth-desc">
            Open a store to list products, reach shoppers across multiple categories, and manage fulfillment.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '1.25rem' }}>
            <Link to="/register?type=sell" className="btn btn-primary btn-block">
              Open a Store (Register)
            </Link>
            <Link to="/login" state={{ from: { pathname: '/become-seller' } }} className="btn btn-secondary btn-block">
              Sign In with Existing Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="stitch-profile-loading">
        <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
        <p>Loading application details...</p>
      </div>
    );
  }

  return (
    <div className="stitch-onboarding-container">
      {/* Top Notice: Vendor accounts are for selling */}
      <div className="stitch-vendor-role-note">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Vendor accounts are for selling; to buy products use a separate customer account.
        </span>
      </div>

      {/* Top Banner Header */}
      <div className="stitch-onboarding-header">
        <div>
          <span className="stitch-profile-pretitle">Seller Onboarding &amp; Verification</span>
          <h1 className="stitch-onboarding-title">Store Onboarding Application</h1>
          <p className="stitch-onboarding-subtitle">
            Launch your own multi-vendor storefront, list products, and reach thousands of ShopNest shoppers.
          </p>
        </div>
        <div className="stitch-profile-standard-pill">
          <svg className="stitch-profile-verified-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
          <div className="stitch-profile-standard-text">
            <span className="stitch-profile-standard-title">ShopNest Standard</span>
            <span className="stitch-profile-standard-rate">
              Platform Commission: <strong>10%</strong>
            </span>
          </div>
        </div>
      </div>

      {vendorProfile ? (
        <div className="stitch-onboarding-status-card">
          <div className="stitch-onboarding-status-top">
            <div className="stitch-onboarding-status-header-text">
              <h2 className="stitch-onboarding-status-heading">Application Status</h2>
              <p className="stitch-onboarding-status-subhead">Current merchant review progression</p>
            </div>
            <span
              className={`badge ${vendorProfile.status === 'approved'
                ? 'badge-connected'
                : vendorProfile.status === 'pending'
                  ? 'badge-warning'
                  : 'badge-danger'
                }`}
            >
              <span className="badge-dot"></span>
              {vendorProfile.status.toUpperCase()}
            </span>
          </div>

          <div className="stitch-onboarding-store-preview-box">
            <h3 className="stitch-onboarding-store-preview-name">{vendorProfile.storeName}</h3>
            <p className="stitch-onboarding-store-preview-desc">
              {vendorProfile.description || 'No store description provided.'}
            </p>
            {vendorProfile.logoUrl && (
              <div style={{ marginTop: '0.75rem' }}>
                <img
                  src={vendorProfile.logoUrl}
                  alt={vendorProfile.storeName}
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder.svg';
                  }}
                />
              </div>
            )}
          </div>

          {/* Pending Review State */}
          {vendorProfile.status === 'pending' && (
            <div className="stitch-status-state-panel stitch-status-pending-panel">
              <div className="stitch-status-icon-wrap stitch-icon-pending">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="stitch-status-content">
                <h4 className="stitch-status-title">Application pending, we will notify you after admin approval</h4>
                <p className="stitch-status-desc">
                  Our administrative compliance team is reviewing your store details. Once approved, your account will be activated with vendor privileges to access the Vendor Studio and catalog management.
                </p>
                <div className="stitch-status-meta-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={fetchProfile}
                  >
                    Check Status
                  </button>
                  <span className="stitch-status-hint">Typical review turnaround: 12–24 business hours</span>
                </div>
              </div>
            </div>
          )}

          {/* Approved State */}
          {vendorProfile.status === 'approved' && (
            <div className="stitch-status-state-panel stitch-status-approved-panel">
              <div className="stitch-status-icon-wrap stitch-icon-approved">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="stitch-status-content">
                <h4 className="stitch-status-title">Congratulations! Your Store is Approved</h4>
                <p className="stitch-status-desc">
                  Your store is fully activated on ShopNest. You can now manage your catalog, upload product images, and fulfill orders.
                </p>
                <div className="stitch-status-actions-cluster">
                  <Link to="/vendor/products" className="btn btn-primary">
                    Open Vendor Dashboard ➔
                  </Link>
                  <Link to="/vendor/profile" className="btn btn-secondary">
                    View Store Profile
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Rejected State */}
          {vendorProfile.status === 'rejected' && (
            <div className="stitch-status-state-panel stitch-status-rejected-panel">
              <div className="stitch-status-icon-wrap stitch-icon-rejected">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <div className="stitch-status-content">
                <h4 className="stitch-status-title">Application Not Approved</h4>
                <p className="stitch-status-desc">
                  Your seller onboarding application was not approved. Feedback reason:
                </p>
                <div className="stitch-rejection-reason-box">
                  "{vendorProfile.rejectionReason || 'Details provided did not meet ShopNest onboarding requirements.'}"
                </div>
                <div className="stitch-status-meta-row" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setVendorProfile(null)}
                  >
                    Submit New Application
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={fetchProfile}
                  >
                    Refresh Status
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="stitch-onboarding-form-card">
          <div className="stitch-onboarding-form-header">
            <div className="stitch-profile-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div>
              <h2 className="stitch-onboarding-form-title">Vendor Store Application</h2>
              <p className="stitch-onboarding-form-desc">
                Provide your store brand details below. Applications are reviewed by ShopNest administration.
              </p>
            </div>
          </div>

          {location.state?.applyFailed && (
            <div className="stitch-retry-card" role="alert">
              <div className="stitch-retry-card-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <strong>Account created successfully!</strong>
              </div>
              <p>
                Your customer account is active, but your seller application could not be submitted automatically: {error || 'Network error'}. You do not need to register again. You can submit your application now:
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              >
                {isSubmitting ? 'Submitting...' : 'Retry Application Now'}
              </button>
            </div>
          )}

          {error && !location.state?.applyFailed && (
            <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', marginBottom: '1.5rem' }}>
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="stitch-profile-form">
            <div className="stitch-profile-fields-grid">
              <div className="form-group">
                <label htmlFor="store-name" className="form-label">
                  Store Name * (3–60 characters)
                </label>
                <input
                  id="store-name"
                  type="text"
                  className="form-input stitch-profile-input"
                  placeholder="e.g. Apex Electronics, Bloom Fashion"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  minLength={3}
                  maxLength={60}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="store-desc" className="form-label">
                  Store Description (10–500 characters)
                </label>
                <textarea
                  id="store-desc"
                  className="form-input stitch-profile-textarea"
                  rows={4}
                  placeholder="Tell customers about the products you specialize in, store mission, and fulfillment focus..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  minLength={10}
                  maxLength={500}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="store-logo" className="form-label">
                  Store Logo URL (Optional)
                </label>
                <input
                  id="store-logo"
                  type="url"
                  className="form-input stitch-profile-input"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="stitch-commission-rate-card" style={{ marginTop: '0.5rem' }}>
              <div className="stitch-commission-rate-left">
                <div className="stitch-commission-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="5" x2="5" y2="19"></line>
                    <circle cx="6.5" cy="6.5" r="2.5"></circle>
                    <circle cx="17.5" cy="17.5" r="2.5"></circle>
                  </svg>
                </div>
                <div>
                  <h4 className="stitch-commission-card-title">Default ShopNest Commission</h4>
                  <p className="stitch-commission-card-desc">
                    Standard 10% platform commission retained upon checkout split payments.
                  </p>
                </div>
              </div>
              <div className="stitch-commission-rate-right">
                <span className="stitch-commission-rate-num">10%</span>
              </div>
            </div>

            <div className="stitch-profile-action-row">
              <button
                type="submit"
                className="btn btn-primary stitch-save-profile-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting Application...' : 'Submit Vendor Application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
