import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';

export default function SellerApplicationBanner() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const [vendorData, setVendorData] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check session dismissal state
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem('dismissed_seller_status_banner');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Ignore sessionStorage access errors
    }
  }, []);

  // Poll/fetch vendor application status for customer users
  useEffect(() => {
    let isMounted = true;

    if (!user || user.role !== 'customer') {
      setVendorData(null);
      return;
    }

    const checkVendorStatus = async () => {
      try {
        const response = await api.get('/vendors/me');
        if (!isMounted) return;

        const vendor = response.data?.vendor;
        if (vendor) {
          setVendorData(vendor);

          // If vendor is approved on backend but local user role is still customer,
          // refresh user profile to upgrade session tokens & role
          if (vendor.status === 'approved' && refreshUser) {
            await refreshUser();
          }
        } else {
          setVendorData(null);
        }
      } catch {
        // If 404 or not applied, silent no-op
        if (isMounted) {
          setVendorData(null);
        }
      }
    };

    checkVendorStatus();

    return () => {
      isMounted = false;
    };
  }, [user, refreshUser]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('dismissed_seller_status_banner', 'true');
    } catch {
      // Ignore sessionStorage write errors
    }
  };

  // Do not render banner if:
  // 1. Not customer role
  // 2. User dismissed for this session
  // 3. User is currently viewing the become-seller status page itself
  // 4. No vendor status or status is approved
  if (
    !user ||
    user.role !== 'customer' ||
    isDismissed ||
    location.pathname === '/become-seller' ||
    !vendorData ||
    !['pending', 'rejected'].includes(vendorData.status)
  ) {
    return null;
  }

  const isPending = vendorData.status === 'pending';

  return (
    <aside
      className={`stitch-seller-status-banner ${isPending ? 'banner-pending' : 'banner-rejected'}`}
      role="status"
      aria-live="polite"
    >
      <div className="stitch-seller-banner-inner content-container">
        <div className="stitch-seller-banner-content">
          <span className="stitch-seller-banner-icon" aria-hidden="true">
            {isPending ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </span>

          <span className="stitch-seller-banner-text">
            {isPending ? (
              <>
                <strong>Seller application pending:</strong> Your application for store{' '}
                <em>"{vendorData.storeName}"</em> is currently under admin review.
              </>
            ) : (
              <>
                <strong>Seller application not approved:</strong>{' '}
                {vendorData.rejectionReason
                  ? `Reason: ${vendorData.rejectionReason}.`
                  : 'Requirements not met.'}
              </>
            )}
          </span>
        </div>

        <div className="stitch-seller-banner-actions">
          <Link
            to="/become-seller"
            className="stitch-seller-banner-link"
          >
            {isPending ? 'View status' : 'Reapply'} ➔
          </Link>
          <button
            type="button"
            className="stitch-seller-banner-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss seller status notification"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
