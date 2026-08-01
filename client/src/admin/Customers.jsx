import React, { useState, useEffect } from 'react';
import { api, formatINR } from '../api/client';
import Loading from '../components/Loading';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/settings/customers', true).then((d) => setCustomers(d.customers || [])).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? customers.filter((c) =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>Customers ({customers.length})</h2>
      </div>

      <div className="admin-toolbar">
        <input
          className="form-control admin-search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No customers found.</div>
      ) : (
        <div className="table-wrap card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.order_count || 0}</td>
                  <td>{formatINR(c.total_spent || 0)}</td>
                  <td className="text-dim">{c.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

