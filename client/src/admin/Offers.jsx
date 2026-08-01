import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [discountText, setDiscountText] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/settings').then((d) => setSettings(d.settings)).catch(() => {}),
      api.get('/products').then((d) => {
        // Find products with discounted prices
        setOffers(d.products.filter((p) => p.discounted_price));
      }).catch(() => {})
    ]).finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        discount_banner_text: discountText || settings?.discount_banner_text || '',
        offer_title: offerTitle || settings?.offer_title || ''
      }, true);
      const d = await api.get('/settings');
      setSettings(d.settings);
      toast.success('Offers & discount banner updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const productsOnSale = offers.length;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>Offers & Discounts</h2>
      </div>

      <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <div className="card">
          <h3 className="admin-card-title">Discount Banner</h3>
          <div className="form-group">
            <label htmlFor="off-discount">Discount Banner Text</label>
            <textarea
              id="off-discount"
              className="form-control"
              rows="3"
              value={discountText || settings?.discount_banner_text || ''}
              onChange={(e) => setDiscountText(e.target.value)}
              placeholder="e.g. Use code DHAAGE10 for 10% off on your first order!"
            />
          </div>
          <div className="form-group">
            <label htmlFor="off-title">Offer Section Title</label>
            <input
              id="off-title"
              className="form-control"
              value={offerTitle || settings?.offer_title || ''}
              onChange={(e) => setOfferTitle(e.target.value)}
              placeholder="e.g. Today's Best Deals"
            />
          </div>
          <button className="btn btn-gold" onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving…' : 'Save Banner Settings'}
          </button>
        </div>

        <div className="card">
          <h3 className="admin-card-title">Products with Discounts</h3>
          <p className="text-dim" style={{ marginBottom: 14 }}>
            {productsOnSale} product(s) currently have a sale price set.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            To add or edit discounts on a product, go to the{' '}
            <a href="/admin/products" style={{ color: 'var(--gold)' }}>Products page</a> and
            set a <strong>Discounted Price</strong> for any product. Products with a
            discounted price will automatically appear in the Offers/Deals section
            on the storefront.
          </p>
        </div>
      </div>
    </div>
  );
}

