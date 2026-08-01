import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../api/client';
import './CartDrawer.css';

export default function CartDrawer() {
  const { items, subtotal, count, isOpen, closeCart, removeItem, updateQty } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const goCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  const goShop = () => {
    closeCart();
    navigate('/shop');
  };

  return (
    <>
      <div className="cart-overlay" onClick={closeCart}></div>
      <div className="cart-drawer">
        <div className="cart-header">
          <h3>Shopping Bag ({count})</h3>
          <button className="icon-btn" onClick={closeCart} aria-label="Close">✕</button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🛍️</div>
              <h3>Your bag is empty</h3>
              <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>
                Discover our premium designer collection.
              </p>
              <button className="btn btn-gold mt-3" onClick={goShop}>
                Start Shopping
              </button>
            </div>
          ) : (
            items.map((item, idx) => (
              <div className="cart-item" key={idx}>
                <img src={item.image} alt={item.name} />
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <p className="cart-item-meta">
                    {item.size} • {item.color}
                  </p>
                  <div className="cart-item-price">{formatINR(item.price)}</div>
                  <div className="qty-control">
                    <button onClick={() => updateQty(idx, item.qty - 1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(idx, item.qty + 1)}>+</button>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <span className="cart-line-total">
                    {formatINR(item.price * item.qty)}
                  </span>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      removeItem(idx);
                      toast.info(`${item.name} removed from bag.`);
                    }}
                    aria-label="Remove"
                  >✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            <div className="flex-between mb-2">
              <span className="text-muted">Subtotal</span>
              <strong className="text-gold" style={{ fontSize: '1.15rem' }}>
                {formatINR(subtotal)}
              </strong>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 14 }}>
              Shipping calculated at checkout. Secure online payment via Razorpay.
            </p>
            <button className="btn btn-gold btn-block" onClick={goCheckout}>
              Proceed to Checkout
            </button>
            <button className="btn btn-outline btn-block mt-2" onClick={goShop}>
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}

