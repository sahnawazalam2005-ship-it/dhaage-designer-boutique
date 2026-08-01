import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import './StaticPages.css';

export default function Contact() {
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const toast = useToast();

  useEffect(() => {
    api.get('/settings').then((d) => setSettings(d.settings || {})).catch(() => {});
  }, []);

  const whatsapp = (settings.whatsapp_number || '919923267780').replace(/\D/g, '');
  const instagram = settings.instagram_url || '#';
  const address = settings.address || 'Pune, Maharashtra, India';
  const phoneDisplay = settings.phone_display || '+91 99232 67780';
  const mapEmbed = settings.map_embed || '';

  const validate = () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your name.';
    if (form.message.trim().length < 10) errs.message = 'Message should be at least 10 characters.';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const msg = encodeURIComponent(
      `Hello Dhaage Designer!\n\n*Name:* ${form.name}\n*Phone:* ${form.phone || 'N/A'}\n\n*Message:*\n${form.message}`
    );
    window.open(`https://wa.me/${whatsapp}?text=${msg}`, '_blank');
    toast.success('Opening WhatsApp to send your message.');
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | Dhaage Designer Mens Boutique</title>
        <meta name="description" content="Contact Dhaage Designer Mens Boutique. Visit our store, call us, or chat on WhatsApp for styling advice and orders." />
      </Helmet>

      <div className="static-hero">
        <div className="container">
          <h1>Contact Us</h1>
          <p>We'd love to hear from you</p>
        </div>
      </div>

      <div className="page container static-content">
        <div className="contact-layout">
          <div className="contact-info">
            <div className="contact-card">
              <span className="contact-icon">📍</span>
              <div>
                <h4>Visit Our Store</h4>
                <p>{address}</p>
              </div>
            </div>
            <div className="contact-card">
              <span className="contact-icon">📞</span>
              <div>
                <h4>Call Us</h4>
                <p>
                  <a href={`tel:${phoneDisplay.replace(/\s/g, '')}`}>{phoneDisplay}</a>
                </p>
              </div>
            </div>
            <div className="contact-card">
              <span className="contact-icon">💬</span>
              <div>
                <h4>WhatsApp</h4>
                <p>
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                    Chat &amp; order on WhatsApp
                  </a>
                </p>
              </div>
            </div>
            <div className="contact-card">
              <span className="contact-icon">📷</span>
              <div>
                <h4>Instagram</h4>
                <p>
                  <a href={instagram} target="_blank" rel="noopener noreferrer">Follow us on Instagram</a>
                </p>
              </div>
            </div>
          </div>

          <div className="contact-form-wrap card">
            <h3 className="checkout-section-title">Send a Message</h3>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="c-name">Your Name *</label>
                <input
                  id="c-name"
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  value={form.name}
                  onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((x) => ({ ...x, name: '' })); }}
                  placeholder="Full name"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="c-phone">Mobile Number</label>
                <input
                  id="c-phone"
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label htmlFor="c-msg">Message *</label>
                <textarea
                  id="c-msg"
                  className={`form-control ${errors.message ? 'is-invalid' : ''}`}
                  rows="5"
                  value={form.message}
                  onChange={(e) => { setForm((f) => ({ ...f, message: e.target.value })); setErrors((x) => ({ ...x, message: '' })); }}
                  placeholder="How can we help you?"
                />
                {errors.message && <span className="error-text">{errors.message}</span>}
              </div>
              <button className="btn btn-gold" type="submit">Send via WhatsApp</button>
            </form>
          </div>
        </div>

        <div className="map-wrap">
          {mapEmbed ? (
            <iframe
              title="Dhaage Designer Location"
              src={mapEmbed}
              width="100%"
              height="400"
              style={{ border: 0, borderRadius: 12 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <iframe
              title="Dhaage Designer Location"
              src="https://www.google.com/maps?q=Pune,Maharashtra,India&output=embed"
              width="100%"
              height="400"
              style={{ border: 0, borderRadius: 12 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>
      </div>
    </>
  );
}

