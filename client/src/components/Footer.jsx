import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import './Footer.css';

export default function Footer() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get('/settings').then((d) => setSettings(d.settings || {})).catch(() => {});
  }, []);

  const whatsapp = (settings.whatsapp_number || '919923267780').replace(/\D/g, '');
  const instagram = settings.instagram_url || '#';

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col footer-about">
            <Link to="/" className="brand">
              <span className="brand-mark">D</span>
              <span className="brand-text">
                <strong>DHAAGE</strong>
                <small>DESIGNER MENS BOUTIQUE</small>
              </span>
            </Link>
            <p>{settings.about_text || 'Premium designer menswear crafted for the modern gentleman.'}</p>
            <div className="social-links">
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                title="WhatsApp"
                aria-label="WhatsApp"
              >
                <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M16.004 3C8.828 3 3 8.828 3 16.004c0 2.293.6 4.533 1.737 6.508L3 29l6.657-1.704A12.94 12.94 0 0 0 16.004 29C23.18 29 29 23.172 29 16.004 29 8.828 23.18 3 16.004 3zm0 23.605a10.6 10.6 0 0 1-5.423-1.485l-.389-.23-3.952 1.012 1.044-3.85-.255-.398A10.59 10.59 0 0 1 5.395 16c0-5.85 4.76-10.61 10.61-10.61 5.848 0 10.607 4.76 10.607 10.61 0 5.848-4.76 10.605-10.608 10.605zm5.82-7.933c-.318-.16-1.884-.93-2.176-1.036-.292-.107-.505-.16-.718.16-.213.32-.826 1.036-1.012 1.249-.186.213-.372.24-.69.08-.318-.16-1.344-.495-2.56-1.58-.946-.846-1.585-1.89-1.771-2.21-.186-.32-.02-.492.14-.652.143-.143.318-.373.478-.56.16-.186.213-.32.32-.532.106-.213.053-.4-.027-.56-.08-.16-.718-1.73-.984-2.37-.26-.62-.524-.536-.718-.546l-.61-.012c-.213 0-.558.08-.85.4-.293.32-1.117 1.092-1.117 2.663 0 1.571 1.144 3.089 1.304 3.303.16.213 2.253 3.44 5.459 4.823.763.33 1.358.527 1.823.674.766.243 1.463.209 2.014.127.614-.092 1.884-.77 2.15-1.514.265-.744.265-1.381.186-1.514-.08-.133-.292-.213-.61-.373z"/>
                </svg>
              </a>
              <a href={instagram} target="_blank" rel="noopener noreferrer" className="social-btn" title="Instagram" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Shop</h4>
            <ul>
              <li><Link to="/shop">All Products</Link></li>
              <li><Link to="/shop?category=sherwani">Sherwanis</Link></li>
              <li><Link to="/shop?category=suits">Suits</Link></li>
              <li><Link to="/shop?category=blazers">Blazers</Link></li>
              <li><Link to="/shop?category=kurtas">Kurtas</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/track">Track Order</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contact</h4>
            <ul className="contact-list">
              <li>📍 {settings.address || 'Pune, Maharashtra'}</li>
              <li>📞 {settings.phone_display || '+91 99232 67780'}</li>
              <li>
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  💬 Chat with us on WhatsApp
                </a>
              </li>
              <li>
                <a href={instagram} target="_blank" rel="noopener noreferrer">
                  📷 Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Dhaage Designer Mens Boutique. All rights reserved.</p>
          <p className="payment-note">Secure Online Payments via Razorpay</p>
        </div>
      </div>
    </footer>
  );
}

