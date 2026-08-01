import React, { useState, useEffect } from 'react';
import { api, formatINR } from '../api/client';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'preparing',
  'ready_to_ship',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled'
];

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  preparing: 'Product Being Prepared',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const emptyUpdate = {
  order_status: '',
  estimated_delivery: '',
  courier_name: '',
  tracking_number: '',
  custom_message: ''
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState(null);
  const [editing, setEditing] = useState(null); // order id
  const [updateForm, setUpdateForm] = useState(emptyUpdate);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get('/orders', true).then((d) => setOrders(d.orders || [])).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { order_status: newStatus }, true);
      toast.success(`Order #${orderId} marked as ${STATUS_LABELS[newStatus]}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const startEdit = (o) => {
    setEditing(o.id);
    setUpdateForm({
      order_status: o.order_status || '',
      estimated_delivery: o.estimated_delivery || '',
      courier_name: o.courier_name || '',
      tracking_number: o.tracking_number || '',
      custom_message: o.custom_message || ''
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setUpdateForm(emptyUpdate);
  };

  const saveUpdate = async (orderId) => {
    setUpdating(orderId);
    try {
      await api.put(`/orders/${orderId}/update-customer`, updateForm, true);
      toast.success('Customer updated & tracking appended.');
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter ? orders.filter((o) => o.order_status === filter) : orders;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>Orders ({filtered.length})</h2>
      </div>

      <div className="admin-filter-row">
        <button className={`admin-filter-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`admin-filter-btn ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {STATUS_LABELS[s]} ({orders.filter((o) => o.order_status === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No orders found.</div>
      ) : (
        <div className="orders-list">
          {filtered.map((o) => (
            <div className="order-admin-card card" key={o.id}>
              <div className="order-admin-head">
                <div>
                  <strong>Order #{o.order_number}</strong>
                  <div className="order-admin-customer">
                    {o.customer_name} · {o.customer_email} · {o.customer_phone || '—'}
                  </div>
                  <div className="text-dim text-sm">{o.created_at}</div>
                </div>
                <div className="product-admin-price" style={{ textAlign: 'right' }}>
                  <div className="price-now-admin">{formatINR(o.total)}</div>
                  <span className={`badge badge-status-${o.order_status}`}>{STATUS_LABELS[o.order_status]}</span>
                </div>
              </div>

              <div className="order-admin-items">
                {(o.items || []).map((item, i) => (
                  <div className="order-admin-item" key={i}>
                    <span>{item.product_name || item.name || 'Product'} × {item.qty || item.quantity} {item.size ? `(${item.size})` : ''} {item.color ? `[${item.color}]` : ''}</span>
                    <span>{formatINR((item.price || 0) * (item.qty || item.quantity || 1))}</span>
                  </div>
                ))}
              </div>

              {o.address && (
                <div className="text-dim text-sm" style={{ marginBottom: 10 }}>
                  📍 {o.address}, {o.city}, {o.state} - {o.pincode}
                </div>
              )}

              <div className="order-admin-actions">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Update Delivery Status:</label>
                <select
                  className="order-status-select"
                  value={o.order_status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  disabled={updating === o.id}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {updating === o.id && <span style={{ color: 'var(--gold)' }}>Updating…</span>}
              </div>

              <div className="order-admin-customer-update">
                {editing === o.id ? (
                  <>
                    <h4>Update Customer (adds to tracking timeline)</h4>
                    <div className="admin-form-grid">
                      <label className="admin-field">
                        <span>Status</span>
                        <select
                          className="form-control"
                          value={updateForm.order_status}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, order_status: e.target.value }))}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field">
                        <span>Estimated Delivery</span>
                        <input
                          className="form-control"
                          placeholder="e.g. 5 Aug 2026"
                          value={updateForm.estimated_delivery}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, estimated_delivery: e.target.value }))}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Courier Name</span>
                        <input
                          className="form-control"
                          placeholder="e.g. Delhivery, BlueDart"
                          value={updateForm.courier_name}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, courier_name: e.target.value }))}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Tracking Number</span>
                        <input
                          className="form-control"
                          placeholder="AWB / tracking no."
                          value={updateForm.tracking_number}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, tracking_number: e.target.value }))}
                        />
                      </label>
                      <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
                        <span>Custom Message to Customer</span>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="e.g. Your sherwani is ready for dispatch!"
                          value={updateForm.custom_message}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, custom_message: e.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="admin-form-actions">
                      <button className="btn btn-gold btn-sm" onClick={() => saveUpdate(o.id)} disabled={updating === o.id}>
                        {updating === o.id ? 'Saving…' : 'Save & Notify'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(o)}>
                    ✏️ Update Customer (Delivery details / message)
                  </button>
                )}
              </div>

              <div className="text-dim text-sm" style={{ marginTop: 10 }}>
                💳 Razorpay • {o.payment_status}
                {o.razorpay_payment_id ? ` • Payment ID: ${o.razorpay_payment_id}` : ''}
                <span className={`badge badge-status-${o.payment_status}`} style={{ marginLeft: 8 }}>Payment: {o.payment_status}</span>
              </div>
              {o.razorpay_order_id && (
                <div className="text-dim text-sm" style={{ marginTop: 4 }}>
                  Razorpay Order: {o.razorpay_order_id}
                  {o.paid_at && <> · Paid: {o.paid_at}</>}
                </div>
              )}
              {(o.estimated_delivery || o.courier_name || o.tracking_number) && (
                <div className="text-dim text-sm" style={{ marginTop: 4 }}>
                  📦 {o.estimated_delivery && `ETA: ${o.estimated_delivery} `}
                  {o.courier_name && `• ${o.courier_name} `}
                  {o.tracking_number && `• Track: ${o.tracking_number}`}
                </div>
              )}
              <div className="text-dim text-sm" style={{ marginTop: 4 }}>
                <a href={`https://wa.me/919923267780?text=Hi%20${encodeURIComponent(o.customer_name || '')}%2C%20your%20Dhaage%20order%20%23${o.order_number}%20is%20${encodeURIComponent(o.order_status)}.`} target="_blank" rel="noopener noreferrer">📱 Contact Customer on WhatsApp</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

