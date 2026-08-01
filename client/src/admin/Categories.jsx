import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const emptyForm = { name: '', description: '', image: '' };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = () => {
    api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Category name is required.');
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form, true);
        toast.success('Category updated.');
      } else {
        await api.post('/categories', form, true);
        toast.success('Category created.');
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editCategory = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description || '', image: c.image || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteCategory = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"? Products in this category will remain but become uncategorized.`)) return;
    try {
      await api.del(`/categories/${c.id}`, true);
      toast.success('Category deleted.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>Categories</h2>
      </div>

      <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1.4fr', alignItems: 'start' }}>
        <div className="card">
          <h3 className="admin-card-title">{editingId ? 'Edit Category' : 'Add Category'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="cat-name">Name *</label>
              <input
                id="cat-name"
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sherwanis"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cat-desc">Description</label>
              <textarea
                id="cat-desc"
                className="form-control"
                rows="3"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cat-image">Image URL</label>
              <input
                id="cat-image"
                className="form-control"
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://… (optional)"
              />
            </div>
            <div className="admin-form-actions">
              <button className="btn btn-gold" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update Category' : 'Add Category'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setEditingId(null); setForm(emptyForm); }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <h3 className="admin-card-title">All Categories ({categories.length})</h3>
          {loading ? (
            <Loading />
          ) : categories.length === 0 ? (
            <p className="text-dim">No categories yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Products</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        {c.image && <div><img src={c.image} alt={c.name} style={{ width: 40, height: 50, objectFit: 'cover', borderRadius: 6, marginTop: 4 }} /></div>}
                      </td>
                      <td className="text-dim">{c.slug}</td>
                      <td>{c.product_count}</td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-outline btn-sm" onClick={() => editCategory(c)}>Edit</button>
                          <button className="btn btn-dark btn-sm" onClick={() => deleteCategory(c)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

