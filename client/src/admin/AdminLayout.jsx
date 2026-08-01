import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './admin.css';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/products', label: 'Products', icon: '🧵' },
  { to: '/admin/categories', label: 'Categories', icon: '🗂️' },
  { to: '/admin/banners', label: 'Banners', icon: '🖼️' },
  { to: '/admin/orders', label: 'Orders', icon: '📦' },
  { to: '/admin/customers', label: 'Customers', icon: '👥' },
  { to: '/admin/offers', label: 'Offers', icon: '🏷️' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' }
];

export default function AdminLayout() {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !isAdmin) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  const handleLogout = () => {
    logout();
    toast.info('Logged out of admin.');
    navigate('/admin/login');
  };

  return (
    <div className="admin-wrap">
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-head">
          <span className="brand-mark">D</span>
          <div>
            <strong>DHAAGE</strong>
            <small>Admin Panel</small>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <NavLink to="/" className="admin-nav-link">🌐 View Store</NavLink>
          <button className="admin-nav-link logout" onClick={handleLogout}>⏻ Logout</button>
        </div>
      </div>

      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)}></div>}

      <div className="admin-main">
        <div className="admin-topbar">
          <button className="admin-burger" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="admin-topbar-title">Dhaage Designer — Store Management</div>
          <div className="admin-topbar-user">
            <span className="admin-avatar">{(user.name || 'A')[0].toUpperCase()}</span>
            <span className="admin-user-name">{user.name}</span>
          </div>
        </div>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

