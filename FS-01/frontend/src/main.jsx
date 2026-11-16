import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Fire-and-forget warm-up ping to wake up free Render instance early on app load
const backendUrl = import.meta.env.VITE_BACKEND_URL;
if (backendUrl) {
  try {
    const cleanUrl = backendUrl.replace(/\/+$/, '');
    fetch(`${cleanUrl}/api/health`, { mode: 'no-cors' }).catch(() => {});
  } catch {
    // Ignore warm-up ping errors
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
