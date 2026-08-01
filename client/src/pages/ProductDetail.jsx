import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, formatINR, discountPercent } from '../api/client';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';
import ProductCard from '../components/ProductCard';
import './ProductDetail.css';

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [qty, setQty] = useState(1);
  const [related, setRelated] = useState([]);
  const [settings, setSettings] = useState({});
  const [lightbox, setLightbox] = useState(false);
  const { addItem } = useCart();
  const toast = useToast();

  const trackRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/products/slug/${slug}`).then((d) => {
      setProduct(d.product);
      setSelectedSize(d.product.sizes?.[0] || '');
      setSelectedColor(d.product.colors?.[0] || '');
      setActiveImg(0);
      setQty(1);
      if (d.product.category_id) {
        return api.get(`/products?category=${d.product.category_slug}`).then((r) => {
          setRelated(r.products.filter((p) => p.id !== d.product.id).slice(0, 4));
        });
      }
      setRelated([]);
    }).catch(() => {
      setProduct(null);
    }).finally(() => setLoading(false));

    api.get('/settings').then((d) => setSettings(d.settings || {})).catch(() => {});
  }, [slug]);

  const images = product?.images?.length
    ? product.images
    : [{ image_url: 'https://placehold.co/800x1000/1a1a1a/e8c86b?text=Dhaage' }];

  /** Scroll the snap track to a specific image index */
  const scrollToImage = useCallback((index) => {
    const track = trackRef.current;
    if (!track) return;
    const safe = Math.max(0, Math.min(index, images.length - 1));
    track.scrollTo({ left: safe * track.clientWidth, behavior: 'smooth' });
  }, [images.length]);

  /** Keep activeImg in sync with the scroll position (dots / arrows) */
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    setActiveImg(Math.max(0, Math.min(idx, images.length - 1)));
  }, [images.length]);

  const nextImage = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const current = Math.round(track.scrollLeft / track.clientWidth);
    if (current < images.length - 1) scrollToImage(current + 1);
  }, [images.length, scrollToImage]);

  const prevImage = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const current = Math.round(track.scrollLeft / track.clientWidth);
    if (current > 0) scrollToImage(current - 1);
  }, [scrollToImage]);

  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [lightbox]);

  if (loading) return <Loading />;

  if (!product) {
    return (
      <div className="page container empty-state">
        <div className="icon">🔍</div>
        <h2>Product not found</h2>
        <p className="text-muted mt-2">The product you're looking for doesn't exist or has been removed.</p>
        <Link to="/shop" className="btn btn-gold mt-3">Back to Shop</Link>
      </div>
    );
  }

  const disc = discountPercent(product.price, product.discounted_price);
  const outOfStock = !product.in_stock || product.stock === 0;

  const handleAddToCart = () => {
    if (outOfStock) {
      toast.error('This product is currently out of stock.');
      return;
    }
    addItem(product, { size: selectedSize, color: selectedColor, qty });
    toast.success(`${product.name} added to bag.`);
  };

  const handleBuyNow = () => {
    if (outOfStock) {
      toast.error('This product is currently out of stock.');
      return;
    }
    addItem(product, { size: selectedSize, color: selectedColor, qty });
    toast.success('Proceeding to checkout…');
    setTimeout(() => {
      window.location.href = '/checkout';
    }, 500);
  };

  const waNumber = (settings.whatsapp_number || '919923267780').replace(/\D/g, '');
  const waMsg = encodeURIComponent(`Hi Dhaage Designer! I'm interested in ${product.name} (${selectedSize}, ${selectedColor}). Could you share more details?`);
  const waLink = `https://wa.me/${waNumber}?text=${waMsg}`;

  return (
    <>
      <Helmet>
        <title>{product.name} | Dhaage Designer</title>
        <meta name="description" content={product.description?.slice(0, 160)} />
        {images[0]?.image_url && <meta property="og:image" content={images[0].image_url} />}
      </Helmet>

      <div className="page container">
        <nav className="breadcrumb">
          <Link to="/">Home</Link> /
          <Link to="/shop">Shop</Link> /
          {product.category_name && <Link to={`/shop?category=${product.category_slug}`}>{product.category_name}</Link>} /
          <span>{product.name}</span>
        </nav>

        <div className="pd-layout">
          {/* Gallery */}
          <div className="pd-gallery">
            <div
              className="pd-main-img"
              onClick={() => images.length > 0 && setLightbox(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setLightbox(true); }}
            >
              {/* Snap track — swipeable on mobile, arrow-driven on desktop */}
              <div
                className="pd-track"
                ref={trackRef}
                onScroll={handleScroll}
              >
                {images.map((img, i) => (
                  <div className="pd-slide" key={img.id || i}>
                    <img
                      src={img.image_url}
                      alt={`${product.name} ${i + 1}`}
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>

              {disc > 0 && <span className="badge badge-gold pd-discount">-{disc}% OFF</span>}

              {/* Desktop prev/next arrows */}
              {images.length > 1 && (
                <>
                  <button
                    className="pd-nav pd-nav-prev"
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    className="pd-nav pd-nav-next"
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              )}

              {/* Position dots */}
              {images.length > 1 && (
                <div className="pd-dots">
                  {images.map((img, i) => (
                    <button
                      key={img.id || i}
                      className={`pd-dot ${i === activeImg ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); scrollToImage(i); }}
                      aria-label={`Image ${i + 1}`}
                    ></button>
                  ))}
                </div>
              )}

              <div className="pd-zoom-hint">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                <span>Tap to view larger</span>
              </div>
            </div>

            {/* Thumbnails — desktop */}
            {images.length > 1 && (
              <div className="pd-thumbs">
                {images.map((img, i) => (
                  <button
                    key={img.id || i}
                    className={`pd-thumb ${i === activeImg ? 'active' : ''}`}
                    onClick={() => scrollToImage(i)}
                  >
                    <img src={img.image_url} alt={`${product.name} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="pd-info">
            <span className="product-category">{product.category_name || 'Premium Menswear'}</span>
            <h1 className="pd-title">{product.name}</h1>

            <div className="pd-price-row">
              <span className="pd-price">{formatINR(product.discounted_price || product.price)}</span>
              {product.discounted_price && (
                <span className="pd-price-old">{formatINR(product.price)}</span>
              )}
              {disc > 0 && <span className="badge badge-gold">Save {disc}%</span>}
            </div>

            <div className="pd-availability">
              {outOfStock ? (
                <span className="text-danger" style={{ color: 'var(--danger)' }}>● Out of Stock</span>
              ) : product.stock < 5 ? (
                <span style={{ color: 'var(--warning)' }}>● Only {product.stock} left in stock</span>
              ) : (
                <span style={{ color: 'var(--success)' }}>● In Stock</span>
              )}
            </div>

            <p className="pd-desc">{product.description}</p>

            {product.sizes?.length > 0 && (
              <div className="pd-select-group">
                <span className="pd-select-label">Select Size</span>
                <div className="pd-size-row">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      className={`pd-size ${selectedSize === s ? 'active' : ''}`}
                      onClick={() => setSelectedSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.colors?.length > 0 && (
              <div className="pd-select-group">
                <span className="pd-select-label">Select Color</span>
                <div className="pd-color-row">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      className={`pd-color ${selectedColor === c ? 'active' : ''}`}
                      onClick={() => setSelectedColor(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pd-qty-row">
              <span className="pd-select-label">Quantity</span>
              <div className="pd-qty">
                <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span>{qty}</span>
                <button onClick={() => setQty(qty + 1)}>+</button>
              </div>
            </div>

            <div className="pd-actions">
              <button className="btn btn-gold" onClick={handleAddToCart} disabled={outOfStock}>
                🛍️ Add to Bag
              </button>
              <button className="btn btn-outline" onClick={handleBuyNow} disabled={outOfStock}>
                Buy Now
              </button>
            </div>

            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-dark btn-block">
              💬 Enquire on WhatsApp
            </a>

            <div className="pd-perks">
              <div className="pd-perk">🚚 Free shipping above ₹999</div>
              <div className="pd-perk">💳 Secure online payment via Razorpay</div>
              <div className="pd-perk">↩️ Easy returns &amp; exchanges</div>
              <div className="pd-perk">✂️ Custom tailoring available</div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="related-section">
            <div className="section-head">
              <span className="section-eyebrow">You May Also Like</span>
              <h2 className="section-title">Related Products</h2>
            </div>
            <div className="grid grid-4">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i * 0.06} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen lightbox */}
      {lightbox && (
        <div className="pd-lightbox" onClick={() => setLightbox(false)}>
          <button
            className="pd-lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            aria-label="Close"
          >
            ✕
          </button>
          <div className="pd-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <button className="pd-nav pd-nav-prev" onClick={() => prevImage()} aria-label="Previous image">‹</button>
            )}
            <img
              src={images[activeImg]?.image_url}
              alt={product.name}
              className="pd-lightbox-img"
            />
            {images.length > 1 && (
              <button className="pd-nav pd-nav-next" onClick={() => nextImage()} aria-label="Next image">›</button>
            )}
            {images.length > 1 && (
              <div className="pd-dots pd-dots-lightbox">
                {images.map((img, i) => (
                  <button
                    key={img.id || i}
                    className={`pd-dot ${i === activeImg ? 'active' : ''}`}
                    onClick={() => scrollToImage(i)}
                    aria-label={`Image ${i + 1}`}
                  ></button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

