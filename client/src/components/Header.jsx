import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../api/client';
import './Header.css';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { count, openCart } = useCart();
  const [settings, setSettings] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/settings').then((d) => setSettings(d.settings || {})).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
      setMenuOpen(false);
    }
  };

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    { to: '/track', label: 'Track Order' }
  ];

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span></span><span></span><span></span>
          </button>

          <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark">D</span>
            <span className="brand-text">
              <strong>DHAAGE</strong>
              <small>DESIGNER MENS BOUTIQUE</small>
            </span>
          </Link>

          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className="nav-link admin-link" onClick={() => setMenuOpen(false)}>
                Admin
              </NavLink>
            )}
          </nav>

          <div className="header-actions">
            <form className="search-box hide-mobile" onSubmit={handleSearch}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                aria-label="Search"
              />
            </form>

            {user ? (
              <div className="user-menu">
                <Link to={isAdmin ? '/admin' : '/profile'} className="icon-btn" title={user.name} aria-label="Account">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </Link>
                <button className="icon-btn" onClick={logout} title="Logout" aria-label="Logout">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              </div>
            ) : (
              <Link to="/login" className="icon-btn" title="Login" aria-label="Login">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </Link>
            )}

            <button className="icon-btn cart-btn" onClick={openCart} title="Shopping Bag" aria-label="Shopping Bag">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              {count > 0 && <span className="cart-count">{count}</span>}
            </button>
          </div>
        </div>

        {settings.announcement && (
          <div className="announcement">
            <span>{settings.announcement}</span>
          </div>
        )}
      </header>

      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)}></div>}
    </>
  );
}

