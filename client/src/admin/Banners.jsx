import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const emptyForm = { title: '', subtitle: '', link: '', image_url: '', active: true, sort_order: 0 };

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = () => {
    api.get('/banners?all=1').then((d) => setBanners(d.banners)).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Banner title is required.');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('subtitle', form.subtitle);
      fd.append('link', form.link);
      fd.append('active', form.active ? '1' : '0');
      fd.append('sort_order', form.sort_order);
      if (imageFile) fd.append('image', imageFile);
      if (!imageFile && !editingId) fd.append('image_url', form.image_url);

      if (editingId) {
        await api.upload(`/banners/${editingId}`, fd, true);
        toast.success('Banner updated.');
      } else {
        await api.upload('/banners', fd, true);
        toast.success('Banner created.');
      }
      setForm(emptyForm);
      setEditingId(null);
      setImageFile(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not save banner.');
    } finally {
      setSaving(false);
    }
  };

  const editBanner = (b) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      subtitle: b.subtitle || '',
      link: b.link || '',
      image_url: b.image_url || '',
      active: b.active === 1,
      sort_order: b.sort_order
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBanner = async (b) => {
    if (!window.confirm(`Delete banner "${b.title}"?`)) return;
    try {
      const data = await api.del(`/banners/${b.id}`, true);
      if (data && data.success === true) {
        toast.success('Banner deleted.');
      } else {
        toast.error((data && data.message) || 'Delete failed. Please try again.');
      }
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleActive = async (b) => {
    try {
      const fd = new FormData();
      fd.append('active', b.active ? '0' : '1');
      await api.upload(`/banners/${b.id}`, fd, true);
      toast.success('Banner updated.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>Homepage Banners</h2>
      </div>

      <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1.4fr', alignItems: 'start' }}>
        <div className="card">
          <h3 className="admin-card-title">{editingId ? 'Edit Banner' : 'Add Banner'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="bn-title">Title *</label>
              <input
                id="bn-title"
                className="form-control"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Grand Wedding Collection"
              />
            </div>
            <div className="form-group">
              <label htmlFor="bn-sub">Subtitle</label>
              <input
                id="bn-sub"
                className="form-control"
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                placeholder="e.g. Premium Sherwanis & Suits"
              />
            </div>
            <div className="form-group">
              <label htmlFor="bn-link">Link (optional)</label>
              <input
                id="bn-link"
                className="form-control"
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="/shop?category=sherwani"
              />
            </div>
            <div className="form-group">
              <label>Banner Image</label>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {!imageFile && (
                <input
                  className="form-control mt-2"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="…or paste image URL"
                />
              )}
            </div>
            <div className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="bn-order">Sort Order</label>
                <input
                  id="bn-order"
                  type="number"
                  className="form-control"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Active</label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  />
                  <span>Show on homepage</span>
                </label>
              </div>
            </div>
            <div className="admin-form-actions">
              <button className="btn btn-gold" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update Banner' : 'Add Banner'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setEditingId(null); setForm(emptyForm); setImageFile(null); }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h3 className="admin-card-title">Current Banners ({banners.length})</h3>
          {loading ? (
            <Loading />
          ) : banners.length === 0 ? (
            <p className="text-dim">No banners yet.</p>
          ) : (
            <div className="banner-list">
              {banners.map((b) => (
                <div className="banner-admin-item" key={b.id}>
                  <div className="banner-admin-preview">
                    {b.image_url && <img src={b.image_url} alt={b.title} />}
                  </div>
                  <div className="banner-admin-info">
                    <strong>{b.title}</strong>
                    <p className="text-dim">{b.subtitle || '—'}</p>
                    <div className="banner-admin-badges">
                      {b.active === 1 ? (
                        <span className="badge badge-status-delivered">Active</span>
                      ) : (
                        <span className="badge badge-status-cancelled">Inactive</span>
                      )}
                      <span className="text-dim">Order: {b.sort_order}</span>
                    </div>
                  </div>
                  <div className="banner-admin-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => toggleActive(b)}>
                      {b.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => editBanner(b)}>Edit</button>
                    <button className="btn btn-dark btn-sm" onClick={() => deleteBanner(b)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

