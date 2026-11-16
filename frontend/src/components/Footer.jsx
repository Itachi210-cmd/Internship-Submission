import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { BRAND_NAME } from '../constants/brand';

export default function Footer() {
  const { user, isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="content-container">
        <div className="footer-grid">
          {/* Brand info */}
          <div className="footer-brand-col">
            <Link to="/" className="nav-brand" style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
              <div className="brand-icon">S</div>
              <span className="brand-name">{BRAND_NAME}</span>
            </Link>
            <p className="footer-text">
              The multi-vendor ecosystem for independent brands and modern shoppers at {BRAND_NAME}. Browse multiple stores, checkout in one seamless transaction.
            </p>
          </div>

          {/* Role-Specific Columns */}

          {/* ADMIN ROLE */}
          {user?.role === 'admin' && (
            <>
              <div className="footer-col">
                <h4 className="footer-col-title">Catalog</h4>
                <ul className="footer-links">
                  <li><Link to="/products">All Products</Link></li>
                  <li><Link to="/admin/orders">All Orders</Link></li>
                </ul>
              </div>

              {/* Sell / Admin Operations: Vendor Studio & Seller Earnings are HIDDEN for admin */}
              <div className="footer-col">
                <h4 className="footer-col-title">Operations</h4>
                <ul className="footer-links">
                  <li><Link to="/admin/vendors">Vendor Approvals</Link></li>
                  <li><Link to="/admin/payouts">Payouts</Link></li>
                  <li><Link to="/admin/coupons">Platform Coupons</Link></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Admin Panel</h4>
                <ul className="footer-links">
                  <li><Link to="/admin/analytics">Analytics Dashboard</Link></li>
                  <li><Link to="/admin/vendors">Seller Requests</Link></li>
                  <li><Link to="/admin/orders">Order Records</Link></li>
                </ul>
              </div>
            </>
          )}

          {/* VENDOR ROLE */}
          {user?.role === 'vendor' && (
            <>
              <div className="footer-col">
                <h4 className="footer-col-title">Marketplace</h4>
                <ul className="footer-links">
                  <li><Link to="/products">Browse Catalog</Link></li>
                  <li><Link to="/vendor/profile">Store Profile</Link></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Vendor Studio</h4>
                <ul className="footer-links">
                  <li><Link to="/vendor/products">Manage Products</Link></li>
                  <li><Link to="/vendor/orders">Store Orders</Link></li>
                  <li><Link to="/vendor/earnings">Seller Earnings</Link></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Store Account</h4>
                <ul className="footer-links">
                  <li><Link to="/vendor/profile">Store Settings</Link></li>
                  <li><Link to="/vendor/products">Inventory</Link></li>
                  <li><Link to="/vendor/earnings">Payout History</Link></li>
                </ul>
              </div>
            </>
          )}

          {/* GUEST & CUSTOMER ROLES */}
          {(!user || user?.role === 'customer') && (
            <>
              <div className="footer-col">
                <h4 className="footer-col-title">Shop</h4>
                <ul className="footer-links">
                  <li><Link to="/products">All Products</Link></li>
                  <li><Link to="/cart">Shopping Cart</Link></li>
                  <li><Link to="/orders">My Orders</Link></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Sell</h4>
                <ul className="footer-links">
                  <li>
                    <Link to={isAuthenticated ? '/become-seller' : '/register?type=sell'}>
                      Become a Seller
                    </Link>
                  </li>
                  <li>
                    <Link to={isAuthenticated ? '/become-seller' : '/login'}>
                      Store Onboarding
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Account</h4>
                <ul className="footer-links">
                  {isAuthenticated ? (
                    <>
                      <li><Link to="/orders">My Orders</Link></li>
                      <li><Link to="/cart">View Cart</Link></li>
                      <li><Link to="/become-seller">Seller Status</Link></li>
                    </>
                  ) : (
                    <>
                      <li><Link to="/login">Sign In</Link></li>
                      <li><Link to="/register">Create Account</Link></li>
                      <li><Link to="/register?type=sell">Open a Store</Link></li>
                    </>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {currentYear} {BRAND_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
