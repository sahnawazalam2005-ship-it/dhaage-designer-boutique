import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatINR, discountPercent } from '../api/client';
import './ProductCard.css';

export default function ProductCard({ product, delay = 0 }) {
  const { addItem } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const image = product.image || product.images?.[0]?.image_url || 'https://placehold.co/600x800/1a1a1a/e8c86b?text=Dhaage';
  const disc = discountPercent(product.price, product.discounted_price);
  const outOfStock = !product.in_stock || product.stock === 0;

  const quickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) {
      toast.error('This product is currently out of stock.');
      return;
    }
    addItem(product, { size: 'Standard', color: 'Default', qty: 1 });
    toast.success(`${product.name} added to cart.`);
  };

  const viewProduct = (e) => {
    e.preventDefault();
    navigate(`/product/${product.slug}`);
  };

  return (
    <div
      className="product-card fade-up"
      style={{ animationDelay: `${delay}ms` }}
      onClick={viewProduct}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && viewProduct(e)}
    >
      <div className="product-card-img">
        <img src={image} alt={product.name} loading="lazy" />
        {disc > 0 && <span className="badge badge-gold discount-tag">-{disc}%</span>}
        {outOfStock && (
          <div className="sold-out-overlay">
            <span>Out of Stock</span>
          </div>
        )}
        <button className="quick-add" onClick={quickAdd} disabled={outOfStock}>
          {outOfStock ? 'Sold Out' : '+ Quick Add'}
        </button>
      </div>

      <div className="product-card-info">
        {product.category_name && (
          <span className="product-category">{product.category_name}</span>
        )}
        <h3 className="product-name">{product.name}</h3>
        <div className="product-price">
          <span className="price-now">{formatINR(product.discounted_price || product.price)}</span>
          {product.discounted_price && (
            <span className="price-old">{formatINR(product.price)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

