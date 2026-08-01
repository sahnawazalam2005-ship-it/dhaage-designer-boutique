import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, formatINR } from '../api/client';
import Loading from '../components/Loading';
import './OrderTracking.css';

const STATUS_LABELS = {
  pending: 'Order Placed',
  confirmed: 'Order Confirmed',
  processing: 'Processing',
  preparing: 'Product Being Prepared',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const STATUS_STEP = {
  pending: 1,
  confirmed: 2,
  processing: 3,
  preparing: 4,
  ready_to_ship: 5,
  shipped: 6,
  out_for_delivery: 7,
  delivered: 8,
  cancelled: 8
};

const FLOW = [
  'pending',
  'confirmed',
  'processing',
  'preparing',
  'ready_to_ship',
  'shipped',
  'out_for_delivery',
  'delivered'
];

export default function OrderTracking() {
  const [params] = useSearchParams();
  const initial = params.get('order') || '';
  const placed = params.get('placed') === '1';

  const [orderNo, setOrderNo] = useState(initial);
  const [searched, setSearched] = useState(initial);
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setLoading(true);
      api.get(`/orders/track/${initial}`).then((d) => {
        setOrder(d.order);
        setTracking(d.tracking);
      }).catch((e) => {
        setError(e.message || 'Order not found.');
      }).finally(() => setLoading(false));
    }
  }, [initial]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderNo.trim()) return setError('Please enter your order number.');
    setLoading(true);
    setError('');
    setSearched(orderNo.trim());
    try {
      const d = await api.get(`/orders/track/${orderNo.trim()}`);
      setOrder(d.order);
      setTracking(d.tracking);
    } catch (err) {
      setOrder(null);
      setTracking([]);
      setError(err.message || 'Order not found. Please check the order number.');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? (STATUS_STEP[order.order_status] || 0) : 0;
  const cancelled = order?.order_status === 'cancelled';

  return (
    <>
      <Helmet>
        <title>Track Your Order | Dhaage Designer</title>
        <meta name="description" content="Track your Dhaage Designer order status in real time." />
      </Helmet>

      <div className="page container track-page">
        <h1 className="page-title">Track Your Order</h1>
        <p className="page-subtitle">Enter your order number to see its current status.</p>

        {placed && (
          <div className="order-success-banner">
            <span className="order-success-icon">✅</span>
            <div>
              <h3>Order placed successfully!</h3>
              <p>
                {order?.payment_status === 'paid'
                  ? 'Payment received! Your order is confirmed.'
                  : 'Proceed with online payment via Razorpay to confirm your order.'}
              </p>
            </div>
          </div>
        )}

        {params.get('paid') === '1' && (
          <div className="order-success-banner">
            <span className="order-success-icon">✅</span>
            <div>
              <h3>Payment confirmed!</h3>
              <p>Your payment has been received and your order is confirmed.</p>
            </div>
          </div>
        )}

        {params.get('payment') === 'failed' && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            Payment was not successful. Please try again or contact support.
          </div>
        )}

        <form className="track-form" onSubmit={handleTrack}>
          <input
            className="form-control"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="e.g. DHA-20250101-XXXXXX"
          />
          <button className="btn btn-gold" type="submit" disabled={loading}>
            {loading ? 'Tracking…' : 'Track Order'}
          </button>
        </form>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && <Loading />}

        {order && !loading && (
          <div className="track-result card">
            <div className="track-head">
              <div>
                <h3>Order #{order.order_number}</h3>
                <p className="text-dim">
                  Placed on {order.created_at} • {order.items?.length} items • Paid via Razorpay
                  {order.payment_status === 'paid' && (
                    <span className="badge badge-status-paid" style={{ marginLeft: 8 }}>Paid</span>
                  )}
                </p>
              </div>
              <div className="track-total">
                <span className="text-dim">Total</span>
                <strong className="text-gold">{formatINR(order.total)}</strong>
              </div>
            </div>

            <div className="track-status-label">
              Status: <strong>{STATUS_LABELS[order.order_status] || order.order_status}</strong>
            </div>

            <div className="track-payment-status">
              Payment: <strong className={order.payment_status === 'paid' ? 'text-success' : 'text-warning'}>
                {order.payment_status === 'paid' ? 'Paid via Razorpay' : order.payment_status === 'failed' ? 'Failed' : 'Pending'}
              </strong>
              {order.razorpay_payment_id && order.payment_status === 'paid' && (
                <span className="text-dim" style={{ display: 'block', fontSize: '0.8rem', marginTop: 4 }}>
                  Payment ID: {order.razorpay_payment_id}
                </span>
              )}
              {order.paid_at && order.payment_status === 'paid' && (
                <span className="text-dim" style={{ display: 'block', fontSize: '0.8rem', marginTop: 2 }}>
                  Paid on: {order.paid_at}
                </span>
              )}
            </div>

            {cancelled ? (
              <div className="alert alert-error">This order was cancelled.</div>
            ) : (
              <div className="track-timeline">
                {FLOW.map((step, i) => {
                  const done = currentStep >= i + 1;
                  const active = currentStep === i + 1;
                  return (
                    <div className={`timeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step}>
                      <div className="timeline-dot">
                        {done ? '✓' : i + 1}
                      </div>
                      <div className="timeline-label">{STATUS_LABELS[step]}</div>
                      {i < FLOW.length - 1 && <div className="timeline-line"></div>}
                    </div>
                  );
                })}
              </div>
            )}

            {tracking.length > 0 && (
              <div className="track-activity">
                <h4>Activity & Updates</h4>
                {tracking.map((t, i) => (
                  <div className="activity-item" key={i}>
                    <span className={`dot dot-${t.status}`}></span>
                    <div>
                      <strong>{STATUS_LABELS[t.status] || t.status}</strong>
                      <p className="text-dim">{t.note}</p>
                      <small className="text-dim">{t.created_at}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(order.estimated_delivery || order.courier_name || order.tracking_number) && (
              <div className="track-delivery-info card" style={{ marginTop: 16 }}>
                <h4>Delivery Information</h4>
                {order.estimated_delivery && (
                  <p className="text-dim">📅 Estimated Delivery: <strong>{order.estimated_delivery}</strong></p>
                )}
                {order.courier_name && (
                  <p className="text-dim">🚚 Courier: <strong>{order.courier_name}</strong></p>
                )}
                {order.tracking_number && (
                  <p className="text-dim">📦 Tracking Number: <strong>{order.tracking_number}</strong></p>
                )}
              </div>
            )}

            <div className="track-items">
              <h4>Items</h4>
              {order.items.map((it, i) => (
                <div className="order-item" key={i}>
                  <div>
                    <strong className="order-item-name">{it.name}</strong>
                    <p className="text-dim">{it.size} • {it.color} • ×{it.qty}</p>
                  </div>
                  <span>{formatINR(it.price * it.qty)}</span>
                </div>
              ))}
            </div>

            <div className="track-actions">
              <Link to="/shop" className="btn btn-outline">Continue Shopping</Link>
              <Link to="/contact" className="btn btn-dark">Need Help?</Link>
            </div>
          </div>
        )}

        {!order && !error && !loading && !searched && (
          <div className="track-hint">
            <div className="icon">🚚</div>
            <p className="text-muted">
              Your order number was provided after checkout and in your order confirmation message.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

