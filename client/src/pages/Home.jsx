import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import './Home.css';

export default function Home() {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/banners'),
      api.get('/categories'),
      api.get('/products/featured'),
      api.get('/products/new-arrivals'),
      api.get('/settings')
    ]).then(([b, c, f, n, s]) => {
      setBanners(b.banners);
      setCategories(c.categories);
      setFeatured(f.products);
      setNewArrivals(n.products);
      setSettings(s.settings || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading) return <Loading />;

  const banner = banners[activeBanner];

  return (
    <>
      <Helmet>
        <title>Dhaage Designer Mens Boutique — Premium Menswear, Sherwanis & Suits</title>
        <meta name="description" content="Shop premium designer menswear at Dhaage. Handcrafted sherwanis, tailored suits, blazers, kurtas & indo-western wear. Secure online payment via Razorpay." />
      </Helmet>

      {/* HERO */}
      <section className="hero" style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.96), rgba(255,255,255,0.72)), url(${banner?.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600'})`
      }}>
        <div className="container hero-content fade-up">
          <span className="hero-eyebrow">{banner?.subtitle || settings.site_tagline || 'Premium Menswear'}</span>
          <h1 className="hero-title">{banner?.title || 'Dhaage Designer'}</h1>
          <p className="hero-text">
            {settings.about_text?.slice(0, 130) || 'Crafted sherwanis, tailored suits and designer indo-western wear for the modern gentleman.'}
          </p>
          <div className="hero-actions">
            <Link to={banner?.link || '/shop'} className="btn btn-gold">Shop Collection</Link>
            <Link to="/about" className="btn btn-outline">Our Story</Link>
          </div>
          {banners.length > 1 && (
            <div className="banner-dots">
              {banners.map((_, i) => (
                <button
                  key={i}
                  className={`dot ${i === activeBanner ? 'active' : ''}`}
                  onClick={() => setActiveBanner(i)}
                  aria-label={`Banner ${i + 1}`}
                ></button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* USPS */}
      <section className="usp-strip">
        <div className="container usp-grid">
          <div className="usp-item">
            <span className="usp-icon">✂️</span>
            <div>
              <h4>Bespoke Tailoring</h4>
              <p>Custom-fit menswear crafted to perfection</p>
            </div>
          </div>
          <div className="usp-item">
            <span className="usp-icon">🧵</span>
            <div>
              <h4>Premium Fabrics</h4>
              <p>Luxury silks, wools & handloom textiles</p>
            </div>
          </div>
          <div className="usp-item">
            <span className="usp-icon">💳</span>
            <div>
              <h4>Secure Online Payments</h4>
              <p>Razorpay — UPI, cards, netbanking &amp; wallets</p>
            </div>
          </div>
          <div className="usp-item">
            <span className="usp-icon">🚚</span>
            <div>
              <h4>Pan-India Delivery</h4>
              <p>Free shipping on orders above ₹999</p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section">
        <div className="container">
          <div className="section-head fade-up">
            <span className="section-eyebrow">Curated for You</span>
            <h2 className="section-title">Shop by Category</h2>
            <p className="section-sub">Explore our handpicked collections for every occasion.</p>
          </div>
          <div className="category-grid">
            {categories.slice(0, 6).map((cat, i) => (
              <Link to={`/shop?category=${cat.slug}`} className="category-card fade-up" key={cat.id} style={{ animationDelay: `${i * 0.08}s` }}>
                <img src={cat.image} alt={cat.name} loading="lazy" />
                <div className="category-overlay">
                  <h3>{cat.name}</h3>
                  <span className="category-count">{cat.product_count} items</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Handpicked</span>
            <h2 className="section-title">Featured Collection</h2>
            <p className="section-sub">Signature pieces our designers love most.</p>
          </div>
          <div className="grid grid-4">
            {featured.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i * 0.08} />
            ))}
          </div>
          <div className="text-center mt-4">
            <Link to="/shop" className="btn btn-outline">View All Products</Link>
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Just In</span>
            <h2 className="section-title">New Arrivals</h2>
            <p className="section-sub">Fresh from the atelier to your wardrobe.</p>
          </div>
          <div className="grid grid-4">
            {newArrivals.slice(0, 8).map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i * 0.06} />
            ))}
          </div>
        </div>
      </section>

      {/* BESPOKE CTA */}
      <section className="bespoke-cta">
        <div className="container bespoke-inner fade-up">
          <span className="section-eyebrow">Custom Made</span>
          <h2>Bespoke &amp; Custom Designed Clothing</h2>
          <p>Work with our master tailors to create a one-of-a-kind piece tailored exclusively for you.</p>
          <a
            href={`https://wa.me/${(settings.whatsapp_number || '919923267780').replace(/\D/g, '')}?text=${encodeURIComponent('Hi Dhaage! I would like to enquire about a bespoke / custom tailored outfit.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gold"
          >
            Enquire on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}

