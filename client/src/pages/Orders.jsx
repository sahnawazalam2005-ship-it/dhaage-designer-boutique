import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import './Orders.css';

const STATUS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/orders' } });
      return;
    }
    api.get('/orders/my', true).then((d) => setOrders(d.orders)).catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  return (
    <>
      <Helmet>
        <title>My Orders | Dhaage Designer</title>
        <meta name="description" content="View your order history at Dhaage Designer Mens Boutique." />
      </Helmet>

      <div className="page container">
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track and review all your orders in one place.</p>

        {loading ? (
          <Loading />
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <h3>No orders yet</h3>
            <p className="text-muted mt-2">When you place an order, it will show up here.</p>
            <Link to="/shop" className="btn btn-gold mt-3">Shop Now</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((o) => (
              <div className="order-card card" key={o.id}>
                <div className="order-card-head">
                  <div>
                    <strong className="order-number">#{o.order_number}</strong>
                    <span className="order-date">{o.created_at}</span>
                  </div>
                  <div className="order-head-right">
                    <span className={`badge badge-status-${o.order_status}`}>
                      {STATUS[o.order_status] || o.order_status}
                    </span>
                    <span className="order-total text-gold">{formatINR(o.total)}</span>
                  </div>
                </div>

                <div className="order-items">
                  {o.items.map((it, i) => (
                    <div className="order-item" key={i}>
                      <div>
                        <strong className="order-item-name">{it.name}</strong>
                        <p className="text-dim">
                          {it.size} • {it.color} • ×{it.qty}
                        </p>
                      </div>
                      <span>{formatINR(it.price * it.qty)}</span>
                    </div>
                  ))}
                </div>

                <div className="order-card-foot">
                  <span className="text-dim">
                    💳 Paid via Razorpay • Payment: {o.payment_status}
                    {o.payment_status === 'paid' && (
                      <span className="badge badge-status-paid" style={{ marginLeft: 8 }}>Paid</span>
                    )}
                  </span>
                  <Link to={`/track?order=${o.order_number}`} className="btn btn-outline btn-sm">
                    Track Order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

