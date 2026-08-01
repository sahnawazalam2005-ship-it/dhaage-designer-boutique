import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, formatINR } from '../api/client';
import Loading from '../components/Loading';
import './PaymentSuccess.css';

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const orderNo = params.get('order') || '';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderNo) {
      setLoading(false);
      setError('No order number provided.');
      return;
    }
    api.get(`/orders/track/${orderNo}`).then((d) => {
      setOrder(d.order);
    }).catch((err) => {
      setError(err.message || 'Could not load order details.');
    }).finally(() => setLoading(false));
  }, [orderNo]);

  if (loading) {
    return (
      <div className="page container">
        <Loading />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page container payment-success-page">
        <Helmet>
          <title>Payment Confirmation | Dhaage Designer</title>
        </Helmet>
        <div className="card payment-success-card error-card">
          <div className="payment-success-icon">⚠️</div>
          <h1 className="page-title">Something went wrong</h1>
          <p className="text-muted">{error || 'Order not found.'}</p>
          <div className="payment-success-actions">
            <Link to="/track" className="btn btn-gold">Track Your Order</Link>
            <Link to="/shop" className="btn btn-outline">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid';

  return (
    <>
      <Helmet>
        <title>{isPaid ? 'Payment Successful' : 'Order Details'} | Dhaage Designer</title>
        <meta name="description" content={isPaid ? 'Your payment was successful!' : 'View your order details.'} />
      </Helmet>

      <div className="page container payment-success-page">
        <div className={`card payment-success-card ${isPaid ? 'success-card' : 'info-card'}`}>
          <div className="payment-success-icon">
            {isPaid ? '✅' : '📋'}
          </div>

          <h1 className="page-title">
            {isPaid ? 'Payment Successful!' : 'Order Created'}
          </h1>

          <p className="payment-success-subtitle">
            {isPaid
              ? `Your payment of ${formatINR(order.total)} for Order #${order.order_number} has been confirmed.`
              : `Order #${order.order_number} has been created. Complete the online payment via Razorpay to confirm it.`
            }
          </p>

          <div className="payment-success-details">
            <div className="payment-detail-row">
              <span>Order Number</span>
              <strong>{order.order_number}</strong>
            </div>
            {order.paid_at && (
              <div className="payment-detail-row">
                <span>Paid On</span>
                <strong>{order.paid_at}</strong>
              </div>
            )}
            {order.razorpay_payment_id && (
              <div className="payment-detail-row">
                <span>Payment ID</span>
                <strong style={{ fontSize: '0.85rem' }}>{order.razorpay_payment_id}</strong>
              </div>
            )}
            <div className="payment-detail-row">
              <span>Payment Method</span>
              <strong>Razorpay (Online)</strong>
            </div>
            <div className="payment-detail-row">
              <span>Payment Status</span>
              <strong className={isPaid ? 'text-success' : 'text-warning'}>
                {isPaid ? 'Paid' : 'Pending'}
              </strong>
            </div>
            <div className="payment-detail-row">
              <span>Total Amount</span>
              <strong className="text-gold">{formatINR(order.total)}</strong>
            </div>
            <div className="payment-detail-row">
              <span>Delivery Address</span>
              <strong style={{ fontSize: '0.85rem' }}>
                {order.address}, {order.city}, {order.state} - {order.pincode}
              </strong>
            </div>
          </div>

          <div className="payment-success-actions">
            <Link to={`/track?order=${order.order_number}`} className="btn btn-gold">
              Track Order
            </Link>
            <Link to="/shop" className="btn btn-outline">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

