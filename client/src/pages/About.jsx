import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../api/client';
import './StaticPages.css';

export default function About() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get('/settings').then((d) => setSettings(d.settings || {})).catch(() => {});
  }, []);

  const whatsapp = (settings.whatsapp_number || '919923267780').replace(/\D/g, '');

  return (
    <>
      <Helmet>
        <title>About Us | Dhaage Designer Mens Boutique</title>
        <meta name="description" content="Discover the story of Dhaage Designer — premium menswear, bespoke tailoring and designer clothing crafted for the modern gentleman." />
      </Helmet>

      <div className="static-hero">
        <div className="container">
          <h1>Our Story</h1>
          <p>Dhaage Designer Mens Boutique</p>
        </div>
      </div>

      <div className="page container static-content">
        <div className="about-grid">
          <div className="about-text">
            <span className="section-eyebrow">The House of Dhaage</span>
            <h2 className="section-title">Crafted for the Modern Gentleman</h2>
            <p>
              {settings.about_text || 'At Dhaage Designer, we believe that every man deserves to look his absolute best. Our boutique specialises in premium designer menswear — from handcrafted sherwanis and tailored suits to elegant kurtas and indo-western ensembles.'}
            </p>
            <p>
              Every piece at Dhaage is a celebration of fine fabrics, meticulous craftsmanship and timeless style. Whether it's a wedding, a festival, or a boardroom, our collections are designed to make you stand out with confidence and grace.
            </p>
            <p>
              We offer bespoke tailoring, custom-designed outfits and ready-to-wear luxury — all crafted with the finest silks, wools and handloom textiles sourced from across India.
            </p>
          </div>
          <div className="about-values">
            <div className="value-card">
              <span>🧵</span>
              <h4>Fine Craftsmanship</h4>
              <p>Each garment is stitched with precision by master tailors.</p>
            </div>
            <div className="value-card">
              <span>✦</span>
              <h4>Premium Fabrics</h4>
              <p>Luxury silks, wools, brocades &amp; handloom textiles.</p>
            </div>
            <div className="value-card">
              <span>🎯</span>
              <h4>Bespoke Fit</h4>
              <p>Perfectly tailored fits, made to your measurements.</p>
            </div>
            <div className="value-card">
              <span>💬</span>
              <h4>Personal Service</h4>
              <p>Dedicated styling assistance, available on WhatsApp.</p>
            </div>
          </div>
        </div>

        <div className="cta-banner">
          <h3>Ready to elevate your wardrobe?</h3>
          <p>Explore our collections or chat with our stylists today.</p>
          <div className="cta-actions">
            <Link to="/shop" className="btn btn-gold">Shop Collection</Link>
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

