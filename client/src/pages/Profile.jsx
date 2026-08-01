import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../api/client';
import './Profile.css';

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/profile' } });
      return;
    }
    setName(user.name);
    setPhone(user.phone || '');
    api.get('/orders/my', true).then((d) => setOrders(d.orders)).catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [user, navigate]);

  if (!user) return null;

  const saveProfile = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('Please enter a valid name.');
    setSaving(true);
    try {
      await updateProfile({ name, phone });
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', passwordForm, true);
      toast.success('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Could not change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const statusLabels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  return (
    <>
      <Helmet>
        <title>My Account | Dhaage Designer</title>
        <meta name="description" content="Manage your Dhaage Designer account, view orders and update your profile." />
      </Helmet>

      <div className="page container">
        <h1 className="page-title">My Account</h1>

        <div className="profile-layout">
          <aside className="profile-side card">
            <div className="profile-avatar">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <h3>{user.name}</h3>
            <p className="text-dim">{user.email}</p>
            <ul className="profile-nav">
              <li><Link to="/profile" className="active">👤 Profile</Link></li>
              <li><Link to="/orders">📦 My Orders</Link></li>
              <li><Link to="/track">🚚 Track Order</Link></li>
              <li>
                <button
                  onClick={() => { logout(); toast.info('Logged out.'); navigate('/'); }}
                  className="logout-btn"
                >
                  ⏻ Logout
                </button>
              </li>
            </ul>
          </aside>

          <div className="profile-main">
            <div className="card">
              <h3 className="checkout-section-title">Profile Details</h3>
              <form onSubmit={saveProfile} className="form-grid">
                <div className="form-group">
                  <label htmlFor="p-name">Full Name</label>
                  <input
                    id="p-name"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-email">Email</label>
                  <input id="p-email" className="form-control" value={user.email} disabled />
                </div>
                <div className="form-group">
                  <label htmlFor="p-phone">Mobile Number</label>
                  <input
                    id="p-phone"
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                  />
                </div>
                <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-gold" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>

            <div className="card">
              <h3 className="checkout-section-title">Change Password</h3>
              <form onSubmit={changePassword}>
                <div className="form-group">
                  <label htmlFor="cp-current">Current Password</label>
                  <input
                    id="cp-current"
                    type="password"
                    className="form-control"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cp-new">New Password</label>
                  <input
                    id="cp-new"
                    type="password"
                    className="form-control"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                  />
                </div>
                <button className="btn btn-outline" type="submit" disabled={pwSaving}>
                  {pwSaving ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="card">
              <h3 className="checkout-section-title">Recent Orders</h3>
              {loadingOrders ? (
                <p className="text-dim">Loading orders…</p>
              ) : orders.length === 0 ? (
                <div className="empty-inline">
                  <p className="text-muted">You haven't placed any orders yet.</p>
                  <Link to="/shop" className="btn btn-gold mt-2">Start Shopping</Link>
                </div>
              ) : (
                <div className="mini-orders">
                  {orders.slice(0, 3).map((o) => (
                    <div className="mini-order" key={o.id}>
                      <div>
                        <strong className="mini-order-no">#{o.order_number}</strong>
                        <p className="text-dim">{o.created_at} • {o.items?.length} items</p>
                      </div>
                      <div className="mini-order-right">
                        <span className="text-gold">{formatINR(o.total)}</span>
                        <span className={`badge badge-status-${o.order_status}`}>
                          {statusLabels[o.order_status] || o.order_status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link to="/orders" className="btn btn-outline btn-block mt-3">View All Orders</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

