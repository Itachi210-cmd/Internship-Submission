import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

const VALID_TABS = ['pending', 'approved', 'rejected', 'all'];

export default function VendorApprovalsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state synced with URL ?status=
  const statusParam = searchParams.get('status');
  const initialTab = VALID_TABS.includes(statusParam) ? statusParam : 'pending';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Vendor master list
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [commissionInputs, setCommissionInputs] = useState({});

  // Reject Dialog Modal State
  const [rejectModalVendor, setRejectModalVendor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Sync activeTab if searchParam changes externally
  useEffect(() => {
    const param = searchParams.get('status');
    if (param && VALID_TABS.includes(param) && param !== activeTab) {
      setActiveTab(param);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ status: tab });
    setActionSuccess('');
    setActionError('');
  };

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch up to 200 vendors to maintain reactive counts across all tabs
      const response = await api.get('/admin/vendors?limit=200');
      const list = response.data?.vendors || [];
      setAllVendors(list);

      // Pre-populate commission inputs
      const initialCommissions = {};
      list.forEach((v) => {
        initialCommissions[v._id] = v.commissionPct ?? 10;
      });
      setCommissionInputs(initialCommissions);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.response?.data?.message || err.message || 'Failed to load vendors');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchVendors();
    }
  }, [fetchVendors, user?.role]);

  // Compute live counts
  const pendingCount = allVendors.filter((v) => v.status === 'pending').length;
  const approvedCount = allVendors.filter((v) => v.status === 'approved').length;
  const rejectedCount = allVendors.filter((v) => v.status === 'rejected').length;
  const totalCount = allVendors.length;

  const tabCounts = {
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
    all: totalCount,
  };

  // Filter list for active tab
  const displayedVendors = allVendors.filter((v) => {
    if (activeTab === 'all') return true;
    return v.status === activeTab;
  });

  // Approve Handler
  const handleApprove = async (vendor) => {
    setActionSuccess('');
    setActionError('');
    setProcessingId(vendor._id);

    try {
      const res = await api.patch(`/admin/vendors/${vendor._id}/approve`);

      // Update local state without reload
      setAllVendors((prev) =>
        prev.map((v) =>
          v._id === vendor._id
            ? { ...v, status: 'approved', rejectionReason: '' }
            : v
        )
      );

      setActionSuccess(
        res.data?.message ||
          `Store "${vendor.storeName}" approved successfully! Owner account upgraded to vendor.`
      );
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.message || 'Failed to approve vendor application'
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Reject Modal trigger
  const openRejectModal = (vendor) => {
    setActionSuccess('');
    setActionError('');
    setRejectModalVendor(vendor);
    setRejectReason('Details did not meet onboarding requirements.');
  };

  const closeRejectModal = () => {
    setRejectModalVendor(null);
    setRejectReason('');
    setIsRejecting(false);
  };

  // Confirm Reject
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectModalVendor) return;

    setIsRejecting(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.patch(`/admin/vendors/${rejectModalVendor._id}/reject`, {
        reason: rejectReason.trim(),
      });

      // Update local state without reload
      setAllVendors((prev) =>
        prev.map((v) =>
          v._id === rejectModalVendor._id
            ? { ...v, status: 'rejected', rejectionReason: rejectReason.trim() }
            : v
        )
      );

      setActionSuccess(
        res.data?.message || `Store "${rejectModalVendor.storeName}" application rejected.`
      );
      closeRejectModal();
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.message || 'Failed to reject vendor application'
      );
      setIsRejecting(false);
    }
  };

  // Commission Update Handler
  const handleCommissionUpdate = async (vendorId) => {
    setActionSuccess('');
    setActionError('');
    const rawVal = commissionInputs[vendorId];
    const commissionPct = Number(rawVal);

    if (isNaN(commissionPct) || commissionPct < 0 || commissionPct > 50) {
      setActionError('Commission percentage must be a number between 0% and 50%');
      return;
    }

    setProcessingId(vendorId);
    try {
      await api.patch(`/admin/vendors/${vendorId}/commission`, { commissionPct });

      // Update state without reload
      setAllVendors((prev) =>
        prev.map((v) =>
          v._id === vendorId ? { ...v, commissionPct } : v
        )
      );

      setActionSuccess(`Commission rate updated to ${commissionPct}%`);
    } catch (err) {
      setActionError(
        err.response?.data?.message || err.message || 'Failed to update commission'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'pending':
        return 'No pending seller requests';
      case 'approved':
        return 'No approved stores found';
      case 'rejected':
        return 'No rejected seller applications';
      default:
        return 'No vendor applications found';
    }
  };

  return (
    <div className="stitch-admin-approvals-container">
      {/* Header */}
      <div className="stitch-admin-header">
        <div>
          <h1 className="stitch-admin-title">Vendor Store Approvals</h1>
          <p className="stitch-admin-subtitle">
            Review incoming seller applications, authorize storefront access, and configure custom commission splits.
          </p>
        </div>
        <div className="stitch-approvals-count-pill">
          <span className={`badge ${pendingCount > 0 ? 'badge-warning' : 'badge-connected'}`}>
            {pendingCount} Pending Review
          </span>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="alert-box alert-success" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="alert-box alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs with Count Badges */}
      <div className="stitch-status-tabs-container" style={{ marginBottom: '1.75rem' }}>
        <div className="stitch-status-tabs-row" role="tablist">
          {VALID_TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => handleTabChange(tab)}
              className={`stitch-status-tab-btn ${activeTab === tab ? 'active' : ''}`}
            >
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              <span className={`stitch-tab-count-badge ${activeTab === tab ? 'active' : ''}`}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content States */}
      {loading ? (
        <div className="stitch-profile-loading">
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p>Fetching vendor applications...</p>
        </div>
      ) : error ? (
        <div className="stitch-empty-state-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Failed to Load Seller Requests</h3>
          <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchVendors}>
            Retry Loading
          </button>
        </div>
      ) : displayedVendors.length === 0 ? (
        <div className="stitch-payouts-table-card">
          <div className="stitch-empty-state-card" style={{ border: 'none', padding: '4rem 1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{getEmptyMessage()}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
              {activeTab === 'pending'
                ? 'All seller onboarding requests have been reviewed.'
                : `There are currently no seller applications in the "${activeTab}" category.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="stitch-payouts-table-card">
          <div className="stitch-payouts-card-header">
            <div>
              <h3 className="stitch-payouts-title">Seller Applications</h3>
              <p className="stitch-payouts-desc">Verified merchant onboarding and commission controls</p>
            </div>
            <span className="stitch-payouts-count-badge">
              {displayedVendors.length} {displayedVendors.length === 1 ? 'store' : 'stores'}
            </span>
          </div>

          {/* Desktop & Tablet Table */}
          <div className="table-responsive stitch-approvals-desktop-table">
            <table className="stitch-payouts-table">
              <thead>
                <tr>
                  <th>Store / Vendor</th>
                  <th>Applicant</th>
                  <th>Description</th>
                  <th className="align-center">Status</th>
                  <th>Commission (%)</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedVendors.map((vendor) => {
                  const isPending = vendor.status === 'pending';
                  const isBusy = processingId === vendor._id;

                  return (
                    <tr key={vendor._id}>
                      <td>
                        <div className="stitch-vendor-table-store-cell">
                          {vendor.logoUrl ? (
                            <img
                              src={vendor.logoUrl}
                              alt={vendor.storeName}
                              className="stitch-vorder-item-thumb"
                              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="stitch-vendor-table-thumb-placeholder">
                              🏪
                            </div>
                          )}
                          <div>
                            <strong className="stitch-vendor-table-store-name">{vendor.storeName}</strong>
                            <div className="stitch-vendor-table-date">
                              Applied: {new Date(vendor.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {vendor.userId?.name || 'Unknown'}
                        </div>
                        <small style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                          {vendor.userId?.email || 'No email provided'}
                        </small>
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        <div style={{ lineHeight: 1.45 }}>{vendor.description || 'No description provided.'}</div>
                        {vendor.rejectionReason && (
                          <div className="stitch-payout-fail-msg" style={{ marginTop: '0.35rem' }}>
                            Reason: {vendor.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="align-center">
                        <span
                          className={`badge ${
                            vendor.status === 'approved'
                              ? 'badge-connected'
                              : vendor.status === 'pending'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          <span className="badge-dot"></span>
                          {vendor.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="stitch-commission-inline-group">
                          <div className="stitch-commission-input-wrap">
                            <input
                              type="number"
                              min="0"
                              max="50"
                              className="form-input stitch-commission-mini-input"
                              value={commissionInputs[vendor._id] ?? vendor.commissionPct}
                              onChange={(e) =>
                                setCommissionInputs({ ...commissionInputs, [vendor._id]: e.target.value })
                              }
                              disabled={isBusy}
                            />
                            <span className="stitch-commission-input-suffix">%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCommissionUpdate(vendor._id)}
                            className="btn btn-secondary btn-sm"
                            disabled={isBusy}
                            title="Save custom commission rate (0-50%)"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                      <td className="align-right">
                        {isPending ? (
                          <div className="stitch-approvals-action-cluster">
                            <button
                              type="button"
                              className="btn btn-success stitch-btn-accept"
                              onClick={() => handleApprove(vendor)}
                              disabled={isBusy}
                            >
                              {isBusy ? 'Saving...' : 'Accept'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger stitch-btn-reject"
                              onClick={() => openRejectModal(vendor)}
                              disabled={isBusy}
                            >
                              Reject
                            </button>
                          </div>
                        ) : vendor.status === 'approved' ? (
                          <div className="stitch-status-approved-tag">
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600 }}>
                              ✓ Approved
                            </span>
                          </div>
                        ) : (
                          <div className="stitch-status-rejected-tag">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleApprove(vendor)}
                              disabled={isBusy}
                            >
                              Re-approve
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (< 768px) */}
          <div className="stitch-approvals-mobile-cards">
            {displayedVendors.map((vendor) => {
              const isPending = vendor.status === 'pending';
              const isBusy = processingId === vendor._id;

              return (
                <div key={vendor._id} className="stitch-approval-mobile-card">
                  <div className="stitch-approval-card-header">
                    <div className="stitch-vendor-table-store-cell">
                      {vendor.logoUrl ? (
                        <img
                          src={vendor.logoUrl}
                          alt={vendor.storeName}
                          style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="stitch-vendor-table-thumb-placeholder">
                          🏪
                        </div>
                      )}
                      <div>
                        <strong className="stitch-vendor-table-store-name">{vendor.storeName}</strong>
                        <div className="stitch-vendor-table-date">
                          Applied: {new Date(vendor.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        vendor.status === 'approved'
                          ? 'badge-connected'
                          : vendor.status === 'pending'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      <span className="badge-dot"></span>
                      {vendor.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="stitch-approval-card-details">
                    <div className="stitch-card-detail-item">
                      <span className="stitch-detail-label">Owner</span>
                      <span className="stitch-detail-val">
                        {vendor.userId?.name || 'Unknown'} ({vendor.userId?.email || 'N/A'})
                      </span>
                    </div>

                    <div className="stitch-card-detail-item">
                      <span className="stitch-detail-label">Store Description</span>
                      <p className="stitch-detail-desc">{vendor.description || 'No description provided.'}</p>
                      {vendor.rejectionReason && (
                        <div className="stitch-payout-fail-msg">
                          Reason: {vendor.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="stitch-card-detail-item">
                      <span className="stitch-detail-label">Commission (%)</span>
                      <div className="stitch-commission-inline-group" style={{ marginTop: '0.25rem' }}>
                        <div className="stitch-commission-input-wrap">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            className="form-input stitch-commission-mini-input"
                            value={commissionInputs[vendor._id] ?? vendor.commissionPct}
                            onChange={(e) =>
                              setCommissionInputs({ ...commissionInputs, [vendor._id]: e.target.value })
                            }
                            disabled={isBusy}
                          />
                          <span className="stitch-commission-input-suffix">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCommissionUpdate(vendor._id)}
                          className="btn btn-secondary btn-sm"
                          disabled={isBusy}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Mobile Card */}
                  {isPending && (
                    <div className="stitch-approval-card-actions">
                      <button
                        type="button"
                        className="btn btn-success stitch-btn-accept"
                        onClick={() => handleApprove(vendor)}
                        disabled={isBusy}
                      >
                        {isBusy ? 'Saving...' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger stitch-btn-reject"
                        onClick={() => openRejectModal(vendor)}
                        disabled={isBusy}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reject Modal Dialog */}
      {rejectModalVendor && (
        <div className="modal-backdrop" onClick={closeRejectModal}>
          <div
            className="modal-card stitch-reject-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-dialog-title"
          >
            <div className="modal-header">
              <h3 id="reject-dialog-title" className="modal-title">
                Reject Seller Request
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeRejectModal}
                disabled={isRejecting}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="stitch-reject-form">
              <p className="stitch-reject-intro">
                You are rejecting the store application for{' '}
                <strong>"{rejectModalVendor.storeName}"</strong>. Please provide feedback so the seller understands what to resolve before reapplying.
              </p>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="reject-reason" className="form-label">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  id="reject-reason"
                  className="form-input stitch-form-textarea"
                  rows={3}
                  placeholder="e.g. Incomplete business documents, store description unclear, or catalog policy mismatch..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  disabled={isRejecting}
                  maxLength={500}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeRejectModal}
                  disabled={isRejecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ minHeight: '44px' }}
                  disabled={isRejecting}
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
