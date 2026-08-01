import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, formatINR } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Checkout.css';

const emptyForm = {
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  notes: ''
};

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [razorpayError, setRazorpayError] = useState('');
  const [settings, setSettings] = useState({});

  // Refs for idempotency protection
  const paymentInProgress = useRef(false);
  const currentOrderNumber = useRef(null);

  useEffect(() => {
    api.get('/settings').then((d) => setSettings(d.settings || {})).catch(() => {});
    if (user) {
      setForm((f) => ({
        ...f,
        customer_name: user.name || f.customer_name,
        customer_email: user.email || f.customer_email,
        customer_phone: user.phone || f.customer_phone
      }));
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  /** Load Razorpay checkout script dynamically */
  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Full name is required.';
    if (!/^[6-9]\d{9}$/.test(form.customer_phone.replace(/\D/g, '')))
      e.customer_phone = 'Enter a valid 10-digit mobile number.';
    if (form.customer_email && !/^\S+@\S+\.\S+$/.test(form.customer_email))
      e.customer_email = 'Enter a valid email address.';
    if (!form.address.trim()) e.address = 'Delivery address is required.';
    if (!form.city.trim()) e.city = 'City is required.';
    if (!form.state.trim()) e.state = 'State is required.';
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'Enter a valid 6-digit pincode.';
    return e;
  };

  /**
   * Handle Razorpay payment flow (Razorpay is the ONLY payment method):
   * 1. Create store order
   * 2. Create Razorpay order (via backend)
   * 3. Open Razorpay Checkout (UPI, UPI QR, cards, netbanking, wallets, etc.)
   * 4. Verify payment on backend (HMAC SHA-256 signature verification)
   * 5. Redirect to payment-success page
   */
  const handleRazorpayPayment = async (payload) => {
    if (paymentInProgress.current) {
      toast.warning('Payment already in progress. Please wait…');
      return;
    }
    paymentInProgress.current = true;
    setRazorpayLoading(true);
    setRazorpayError('');

    try {
      // Step 1: Create store order
      const orderData = await api.post('/orders', payload);
      const { order } = orderData;
      currentOrderNumber.current = order.order_number;

      // Step 2: Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Could not load payment gateway. Please try again.');
      }

      // Step 3: Create Razorpay order via backend
      const rzpData = await api.post('/payments/create-order', {
        order_number: order.order_number
      });

      if (rzpData.already_paid) {
        // Order is already paid — redirect to success.
        clearCart();
        toast.success('This order is already paid!');
        navigate(`/payment-success?order=${order.order_number}`);
        return;
      }

      // Step 4: Open Razorpay Checkout
      const options = {
        key: rzpData.key,
        amount: Math.round(rzpData.amount * 100), // paise
        currency: 'INR',
        name: 'Dhaage Designer Boutique',
        description: `Order ${order.order_number}`,
        order_id: rzpData.order_id,
        // Explicitly enable standard payment methods (official Razorpay Checkout v1 API).
        // Ensures the Card tab/form is shown alongside UPI (Enter UPI ID + QR), NetBanking,
        // and Wallets. Without this, some Test Mode sessions surface UPI QR as the only option.
        method: {
          card: true,
          upi: true,
          netbanking: true,
          wallet: true
        },
        prefill: {
          name: form.customer_name,
          email: form.customer_email || '',
          contact: form.customer_phone.replace(/\D/g, '')
        },
        theme: {
          color: '#c9a24b'
        },
        modal: {
          ondismiss: async () => {
            // User cancelled the payment modal → mark as cancelled/pending
            setRazorpayLoading(false);
            paymentInProgress.current = false;
            setRazorpayError('Payment cancelled. You can retry or contact support.');
            try {
              await api.post('/payments/failed', {
                order_number: order.order_number,
                error: 'User cancelled the payment modal'
              });
            } catch {}
          }
        },
        handler: async (response) => {
          // Payment completed — verify on backend (authoritative, HMAC signature check)
          try {
            const verifyResult = await api.post('/payments/verify', {
              order_number: order.order_number,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });

            if (verifyResult.paid) {
              clearCart();
              paymentInProgress.current = false;
              toast.success('Payment successful! Order confirmed.');
              navigate(`/payment-success?order=${order.order_number}`);
            } else {
              throw new Error(verifyResult.message || 'Payment verification failed.');
            }
          } catch (err) {
            paymentInProgress.current = false;
            setRazorpayLoading(false);
            setRazorpayError(err.message || 'Payment verification failed. Please contact support with your order number.');
            navigate(`/track?order=${order.order_number}&payment=failed`);
          }
        }
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', async (paymentResponse) => {
        paymentInProgress.current = false;
        setRazorpayLoading(false);
        const errorMsg = paymentResponse.error?.description || 'Payment failed.';
        setRazorpayError(errorMsg);
        try {
          await api.post('/payments/failed', {
            order_number: order.order_number,
            razorpay_order_id: rzpData.order_id,
            error: errorMsg
          });
        } catch {}
      });

      rzp.open();
    } catch (err) {
      paymentInProgress.current = false;
      setRazorpayLoading(false);
      const msg = err.message || 'Could not start payment. Please try again.';
      setRazorpayError(msg);
      toast.error(msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    setErrors(e2);
    if (Object.keys(e2).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    setPlacing(true);
    setRazorpayError('');

    try {
      const commonPayload = {
        ...form,
        customer_phone: form.customer_phone.replace(/\D/g, ''),
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          size: i.size,
          color: i.color
        })),
        user_id: user?.id || null
      };

      // Razorpay is the only payment method — always go through Razorpay.
      await handleRazorpayPayment({ ...commonPayload, payment_method: 'razorpay' });
    } catch (err) {
      toast.error(err.message || 'Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page container empty-state">
        <div className="icon">📦</div>
        <h2>Your cart is empty</h2>
        <p className="text-muted mt-2">Add some pieces before checking out.</p>
        <Link to="/shop" className="btn btn-gold mt-3">Shop Now</Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Checkout | Dhaage Designer</title>
        <meta name="description" content="Complete your order at Dhaage Designer Mens Boutique with secure online payment via Razorpay." />
      </Helmet>

      <div className="page container">
        <h1 className="page-title">Checkout</h1>
        <p className="page-subtitle">Complete your order — pay securely online via Razorpay (UPI, Cards, NetBanking, Wallets).</p>

        <form className="checkout-layout" onSubmit={handleSubmit} noValidate>
          {/* Left: forms */}
          <div className="checkout-main">
            <div className="card">
              <h3 className="checkout-section-title">1. Contact Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="customer_name">Full Name *</label>
                  <input
                    id="customer_name"
                    className={`form-control ${errors.customer_name ? 'is-invalid' : ''}`}
                    value={form.customer_name}
                    onChange={(e) => setField('customer_name', e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                  />
                  {errors.customer_name && <span className="error-text">{errors.customer_name}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="customer_phone">Mobile Number *</label>
                  <input
                    id="customer_phone"
                    className={`form-control ${errors.customer_phone ? 'is-invalid' : ''}`}
                    value={form.customer_phone}
                    onChange={(e) => setField('customer_phone', e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    inputMode="numeric"
                  />
                  {errors.customer_phone && <span className="error-text">{errors.customer_phone}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="customer_email">Email (optional)</label>
                  <input
                    id="customer_email"
                    type="email"
                    className={`form-control ${errors.customer_email ? 'is-invalid' : ''}`}
                    value={form.customer_email}
                    onChange={(e) => setField('customer_email', e.target.value)}
                    placeholder="you@example.com"
                  />
                  {errors.customer_email && <span className="error-text">{errors.customer_email}</span>}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="checkout-section-title">2. Delivery Address</h3>
              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <textarea
                  id="address"
                  className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  rows="3"
                  placeholder="House no, street, area, landmark"
                />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input
                    id="city"
                    className={`form-control ${errors.city ? 'is-invalid' : ''}`}
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                    placeholder="City"
                  />
                  {errors.city && <span className="error-text">{errors.city}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="state">State *</label>
                  <input
                    id="state"
                    className={`form-control ${errors.state ? 'is-invalid' : ''}`}
                    value={form.state}
                    onChange={(e) => setField('state', e.target.value)}
                    placeholder="State"
                  />
                  {errors.state && <span className="error-text">{errors.state}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="pincode">Pincode *</label>
                  <input
                    id="pincode"
                    className={`form-control ${errors.pincode ? 'is-invalid' : ''}`}
                    value={form.pincode}
                    onChange={(e) => setField('pincode', e.target.value)}
                    placeholder="6-digit pincode"
                    maxLength={6}
                    inputMode="numeric"
                  />
                  {errors.pincode && <span className="error-text">{errors.pincode}</span>}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="checkout-section-title">3. Payment Method</h3>
              <div className="payment-options">
                <div className="payment-option active razorpay-only">
                  <div className="payment-option-body">
                    <span className="payment-option-title">💳 Pay Online via Razorpay</span>
                    <span className="payment-option-sub">
                      Secure payment via Razorpay. Pay with UPI, UPI QR, Credit/Debit Card, NetBanking, Wallets, and more.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="checkout-section-title">4. Order Notes (optional)</h3>
              <textarea
                className="form-control"
                rows="3"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="e.g. Preferred delivery time, customization notes, gift wrapping…"
              />
            </div>
          </div>

          {/* Right: summary */}
          <div className="checkout-summary">
            <div className="card">
              <h3 className="checkout-section-title">Order Summary</h3>
              <div className="co-items">
                {items.map((item, i) => (
                  <div className="co-item" key={i}>
                    <img src={item.image} alt={item.name} />
                    <div className="co-item-info">
                      <span className="co-item-name">{item.name}</span>
                      <span className="co-item-meta">{item.size} • {item.color} • ×{item.qty}</span>
                    </div>
                    <span className="co-item-price">{formatINR(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'FREE' : formatINR(shipping)}</span>
              </div>
              <div className="summary-row summary-total">
                <strong>Total</strong>
                <strong className="text-gold">{formatINR(total)}</strong>
              </div>

              <div className="razorpay-note">
                <strong>🔒 Secure Online Payment</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Your payment is processed securely via Razorpay. We support UPI, UPI QR, Credit/Debit Cards, NetBanking, and Wallets.
                </p>
                {razorpayError && (
                  <div className="alert alert-error" style={{ marginTop: 8 }}>
                    {razorpayError}
                  </div>
                )}
                {razorpayLoading && (
                  <div className="razorpay-loading" style={{ marginTop: 8 }}>
                    <div className="spinner-sm"></div>
                    <span>Preparing payment…</span>
                  </div>
                )}
              </div>

              <button
                className="btn btn-gold btn-block"
                type="submit"
                disabled={placing || razorpayLoading}
              >
                {razorpayLoading ? 'Preparing Payment…' : placing ? 'Placing Order…' : 'Place Order & Pay Securely'}
              </button>
              <p className="summary-note mt-2">
                By placing this order you agree to our{' '}
                <Link to="/terms">Terms &amp; Conditions</Link>.
              </p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

