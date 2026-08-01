import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import Loading from '../components/Loading';

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/stats', true).then((d) => setStats(d.stats)).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!stats) return <div className="admin-empty">Could not load dashboard.</div>;

  const cards = [
    { label: 'Total Revenue', value: formatINR(stats.totalRevenue), icon: '💰', color: 'gold' },
    { label: 'Total Orders', value: stats.totalOrders, icon: '📦', color: 'blue' },
    { label: 'Total Products', value: stats.totalProducts, icon: '🧵', color: 'green' },
    { label: 'Total Customers', value: stats.totalCustomers, icon: '👥', color: 'purple' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: '⏳', color: 'orange' },
    { label: 'Low Stock Items', value: stats.lowStock, icon: '⚠️', color: 'red' }
  ];

  const months = [...(stats.monthly || [])].reverse();
  const maxRevenue = Math.max(...months.map((m) => m.revenue), 1);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>Dashboard</h2>
        <Link to="/admin/products/new" className="btn btn-gold btn-sm">+ Add Product</Link>
      </div>

      <div className="stat-cards">
        {cards.map((c) => (
          <div className="stat-card card" key={c.label}>
            <span className={`stat-icon stat-${c.color}`}>{c.icon}</span>
            <div>
              <h4>{c.label}</h4>
              <strong>{c.value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3 className="admin-card-title">Revenue (Last 6 Months)</h3>
          {months.length === 0 ? (
            <p className="text-dim">No revenue data yet.</p>
          ) : (
            <div className="bar-chart">
              {months.map((m) => (
                <div className="bar-col" key={m.month}>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.max(6, (m.revenue / maxRevenue) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="bar-label">
                    {new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span className="bar-value">₹{Math.round(m.revenue / 1000)}k</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="admin-card-title">Order Status</h3>
          {(stats.statusCounts || []).length === 0 ? (
            <p className="text-dim">No orders yet.</p>
          ) : (
            <div className="status-list">
              {stats.statusCounts.map((s) => (
                <div className="status-row" key={s.status}>
                  <span className="status-dot-wrap">
                    <span className={`dot dot-${s.status}`}></span>
                    {STATUS_LABELS[s.status] || s.status}
                  </span>
                  <strong>{s.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="admin-card-head">
          <h3 className="admin-card-title">Recent Orders</h3>
          <Link to="/admin/orders" className="btn btn-outline btn-sm">View All</Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="text-dim">No orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="text-gold">#{o.order_number}</td>
                    <td>{o.customer_name}</td>
                    <td>{formatINR(o.total)}</td>
                    <td>{o.payment_method === 'razorpay' ? 'Razorpay' : o.payment_method === 'cod' ? 'COD' : o.payment_method}</td>
                    <td><span className={`badge badge-status-${o.order_status}`}>{STATUS_LABELS[o.order_status] || o.order_status}</span></td>
                    <td className="text-dim">{o.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
