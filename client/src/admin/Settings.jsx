import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    site_name: 'Dhaage Designer',
    whatsapp_number: '919923267780',
    store_email: '',
    store_phone: '',
    store_address: '',
    instagram_url: '',
    about_text: '',
    delivery_info: '',
    return_policy: ''
  });
  const toast = useToast();

  useEffect(() => {
    api.get('/settings').then((d) => {
      const s = d.settings || {};
      setForm({
        site_name: s.site_name || 'Dhaage Designer',
        whatsapp_number: '919923267780',
        store_email: s.store_email || '',
        store_phone: s.store_phone || '',
        store_address: s.store_address || '',
        instagram_url: s.instagram_url || '',
        about_text: s.about_text || '',
        delivery_info: s.delivery_info || '',
        return_policy: s.return_policy || ''
      });
      setSettings(s);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', form, true);
      const d = await api.get('/settings');
      setSettings(d.settings);
      toast.success('Settings saved successfully.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <Loading />;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>Site Settings</h2>
      </div>

      <form className="card" onSubmit={handleSave} style={{ maxWidth: 760 }}>
        <div className="admin-form-section">
          <h3>General</h3>
          <div className="form-group">
            <label htmlFor="s-name">Site Name</label>
            <input
              id="s-name"
              className="form-control"
              value={form.site_name}
              onChange={(e) => setField('site_name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="s-whatsapp">WhatsApp Number (with country code, digits only)</label>
            <input
              id="s-whatsapp"
              className="form-control"
              value={form.whatsapp_number}
              onChange={(e) => setField('whatsapp_number', e.target.value)}
              placeholder="919923267780"
            />
            <span className="error-text">Current: +{form.whatsapp_number}</span>
          </div>
        </div>

        <div className="admin-form-section">
          <h3>Contact Information</h3>
          <div className="admin-form-grid">
            <div className="form-group">
              <label htmlFor="s-email">Store Email</label>
              <input
                id="s-email"
                className="form-control"
                value={form.store_email}
                onChange={(e) => setField('store_email', e.target.value)}
                placeholder="info@dhaagedesigner.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="s-phone">Store Phone</label>
              <input
                id="s-phone"
                className="form-control"
                value={form.store_phone}
                onChange={(e) => setField('store_phone', e.target.value)}
                placeholder="+91 9923267780"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="s-address">Store Address</label>
            <textarea
              id="s-address"
              className="form-control"
              rows="3"
              value={form.store_address}
              onChange={(e) => setField('store_address', e.target.value)}
              placeholder="Pune, Maharashtra, India"
            />
          </div>
          <div className="form-group">
            <label htmlFor="s-instagram">Instagram URL</label>
            <input
              id="s-instagram"
              className="form-control"
              value={form.instagram_url}
              onChange={(e) => setField('instagram_url', e.target.value)}
              placeholder="https://instagram.com/dhaagedesigner"
            />
          </div>
        </div>

        <div className="admin-form-section">
          <h3>Content</h3>
          <div className="form-group">
            <label htmlFor="s-about">About Us Text</label>
            <textarea
              id="s-about"
              className="form-control"
              rows="4"
              value={form.about_text}
              onChange={(e) => setField('about_text', e.target.value)}
              placeholder="Tell customers about your boutique…"
            />
          </div>
          <div className="form-group">
            <label htmlFor="s-delivery">Delivery Information</label>
            <textarea
              id="s-delivery"
              className="form-control"
              rows="3"
              value={form.delivery_info}
              onChange={(e) => setField('delivery_info', e.target.value)}
              placeholder="Shipping timelines, areas covered…"
            />
          </div>
          <div className="form-group">
            <label htmlFor="s-return">Return Policy</label>
            <textarea
              id="s-return"
              className="form-control"
              rows="3"
              value={form.return_policy}
              onChange={(e) => setField('return_policy', e.target.value)}
              placeholder="7-day return policy, conditions…"
            />
          </div>
        </div>

        <div className="admin-form-actions">
          <button className="btn btn-gold" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

