import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../api/client';
import './CartPage.css';

export default function CartPage() {
  const { items, subtotal, count, removeItem, updateQty, clearCart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="page container empty-state">
        <div className="icon">🛍️</div>
        <h2>Your shopping bag is empty</h2>
        <p className="text-muted mt-2">Explore our premium collection of sherwanis, suits and more.</p>
        <Link to="/shop" className="btn btn-gold mt-3">Start Shopping</Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Shopping Bag | Dhaage Designer</title>
        <meta name="description" content="Review your shopping bag at Dhaage Designer Mens Boutique." />
      </Helmet>

      <div className="page container">
        <h1 className="page-title">Shopping Bag ({count} items)</h1>

        <div className="cart-layout">
          <div className="cart-table">
            {items.map((item, idx) => (
              <div className="cart-row" key={idx}>
                <Link to={`/product/${item.slug}`} className="cart-row-img">
                  <img src={item.image} alt={item.name} />
                </Link>
                <div className="cart-row-info">
                  <Link to={`/product/${item.slug}`} className="cart-row-name">{item.name}</Link>
                  <p className="cart-row-meta">
                    {item.size} • {item.color}
                  </p>
                  <div className="qty-control">
                    <button onClick={() => updateQty(idx, item.qty - 1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(idx, item.qty + 1)}>+</button>
                  </div>
                </div>
                <div className="cart-row-right">
                  <span className="cart-row-price">{formatINR(item.price * item.qty)}</span>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      removeItem(idx);
                      toast.info(`${item.name} removed.`);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="cart-actions">
              <Link to="/shop" className="btn btn-outline">← Continue Shopping</Link>
              <button
                className="btn btn-dark"
                onClick={() => {
                  clearCart();
                  toast.info('Shopping bag cleared.');
                }}
              >
                Clear Bag
              </button>
            </div>
          </div>

          <div className="cart-summary card">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'FREE' : formatINR(shipping)}</span>
            </div>
            {shipping > 0 && (
              <p className="summary-hint">
                Add {formatINR(999 - subtotal)} more for FREE shipping.
              </p>
            )}
            <div className="summary-row summary-total">
              <strong>Total</strong>
              <strong className="text-gold">{formatINR(total)}</strong>
            </div>
            <button className="btn btn-gold btn-block" onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </button>
            <p className="summary-note">
              💳 Secure online payment via Razorpay.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

