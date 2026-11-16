import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import SellerApplicationBanner from './SellerApplicationBanner';

export default function Layout({ children }) {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'ShopNest',
      '/products': 'Products | ShopNest',
      '/cart': 'Cart | ShopNest',
      '/checkout': 'Checkout | ShopNest',
      '/orders': 'My Orders | ShopNest',
      '/become-seller': 'Become a Seller | ShopNest',
      '/login': 'Login | ShopNest',
      '/register': 'Register | ShopNest',
      '/vendor/products': 'Products | ShopNest',
      '/vendor/orders': 'Orders | ShopNest',
      '/vendor/earnings': 'Earnings | ShopNest',
      '/vendor/profile': 'Store Profile | ShopNest',
      '/admin/analytics': 'Analytics | ShopNest',
      '/admin/vendors': 'Vendor Approvals | ShopNest',
      '/admin/coupons': 'Coupons | ShopNest',
      '/admin/orders': 'All Orders | ShopNest',
      '/admin/payouts': 'Payouts | ShopNest',
    };

    if (location.pathname.startsWith('/products/')) {
      document.title = 'Product Details | ShopNest';
    } else if (location.pathname.startsWith('/orders/')) {
      document.title = 'Order Details | ShopNest';
    } else {
      document.title = titles[location.pathname] || 'ShopNest';
    }
  }, [location.pathname]);

  return (
    <div className="app-container">
      <Navbar />
      <SellerApplicationBanner />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
}
