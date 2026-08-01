import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  discounted_price: '',
  category_id: '',
  sizesText: 'M, L, XL, XXL',
  colorsText: 'Black, Maroon, Navy, Gold',
  featured: false,
  in_stock: true,
  stock: 10
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]); // existing images (edit)
  const [newImages, setNewImages] = useState([]); // File objects
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {});
    if (isEdit) {
      api.get(`/products/${id}`).then((d) => {
        const p = d.product;
        setForm({
          name: p.name,
          description: p.description || '',
          price: p.price,
          discounted_price: p.discounted_price || '',
          category_id: p.category_id || '',
          sizesText: (p.sizes || []).join(', '),
          colorsText: (p.colors || []).join(', '),
          featured: p.featured === 1,
          in_stock: p.in_stock === 1,
          stock: p.stock
        });
        setImages(p.images || []);
      }).catch((err) => toast.error(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const parseList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      price: form.price,
      discounted_price: form.discounted_price || null,
      category_id: form.category_id || null,
      sizes: parseList(form.sizesText),
      colors: parseList(form.colorsText),
      featured: form.featured ? 1 : 0,
      in_stock: form.in_stock ? 1 : 0,
      stock: form.stock
    };

    if (!payload.name.trim()) return toast.error('Product name is required.');
    if (!payload.price || Number(payload.price) <= 0) return toast.error('Enter a valid price.');
    if (payload.discounted_price && Number(payload.discounted_price) >= Number(payload.price)) {
      return toast.error('Discounted price must be lower than the original price.');
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/products/${id}`, payload, true);
        toast.success('Product updated successfully.');
      } else {
        // Create first, then upload images
        const data = await api.post('/products', payload, true);
        toast.success('Product created successfully.');
        if (newImages.length > 0) {
          const fd = new FormData();
          newImages.forEach((f) => fd.append('images', f));
          try {
            await api.upload(`/products/${data.product.id}/images`, fd, true);
          } catch {
            toast.error('Product saved but some images could not be uploaded.');
          }
        }
        navigate('/admin/products');
        return;
      }
    } catch (err) {
      toast.error(err.message || 'Could not save product.');
      setSaving(false);
      return;
    }

    // Upload any new images for edit mode
    if (isEdit && newImages.length > 0) {
      setUploading(true);
      const fd = new FormData();
      newImages.forEach((f) => fd.append('images', f));
      try {
        await api.upload(`/products/${id}/images`, fd, true);
        toast.success('Images uploaded.');
      } catch (err) {
        toast.error(err.message || 'Could not upload images.');
      }
      setUploading(false);
    }

    navigate('/admin/products');
  };

  const deleteImage = async (img) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await api.del(`/products/images/${img.id}`, true);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      toast.success('Image deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="admin-empty">Loading product…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
        <Link to="/admin/products" className="btn btn-outline btn-sm">← Back to Products</Link>
      </div>

      <form className="card" onSubmit={handleSave}>
        <div className="admin-form-section">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label htmlFor="pf-name">Product Name *</label>
            <input
              id="pf-name"
              className="form-control"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Royal Maroon Silk Sherwani"
            />
          </div>
          <div className="form-group">
            <label htmlFor="pf-desc">Description</label>
            <textarea
              id="pf-desc"
              className="form-control"
              rows="4"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Describe the product, fabric, occasion…"
            />
          </div>
        </div>

        <div className="admin-form-section">
          <h3>Pricing</h3>
          <div className="admin-form-grid">
            <div className="form-group">
              <label htmlFor="pf-price">Price (₹) *</label>
              <input
                id="pf-price"
                type="number"
                min="0"
                step="1"
                className="form-control"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="e.g. 14999"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pf-discount">Discounted Price (₹) — optional</label>
              <input
                id="pf-discount"
                type="number"
                min="0"
                step="1"
                className="form-control"
                value={form.discounted_price}
                onChange={(e) => setField('discounted_price', e.target.value)}
                placeholder="e.g. 11999"
              />
            </div>
          </div>
        </div>

        <div className="admin-form-section">
          <h3>Category & Variants</h3>
          <div className="form-group">
            <label htmlFor="pf-cat">Category</label>
            <select
              id="pf-cat"
              className="form-control"
              value={form.category_id}
              onChange={(e) => setField('category_id', e.target.value)}
            >
              <option value="">— Select Category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="admin-form-grid">
            <div className="form-group">
              <label htmlFor="pf-sizes">Sizes (comma separated)</label>
              <input
                id="pf-sizes"
                className="form-control"
                value={form.sizesText}
                onChange={(e) => setField('sizesText', e.target.value)}
                placeholder="M, L, XL, XXL"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pf-colors">Colors (comma separated)</label>
              <input
                id="pf-colors"
                className="form-control"
                value={form.colorsText}
                onChange={(e) => setField('colorsText', e.target.value)}
                placeholder="Black, Maroon, Navy"
              />
            </div>
          </div>
        </div>

        <div className="admin-form-section">
          <h3>Inventory & Status</h3>
          <div className="admin-form-grid">
            <div className="form-group">
              <label htmlFor="pf-stock">Stock Quantity</label>
              <input
                id="pf-stock"
                type="number"
                min="0"
                className="form-control"
                value={form.stock}
                onChange={(e) => setField('stock', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Options</label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setField('featured', e.target.checked)}
                />
                <span>Feature this product</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={(e) => setField('in_stock', e.target.checked)}
                />
                <span>In stock</span>
              </label>
            </div>
          </div>
        </div>

        {(isEdit || newImages.length > 0) && (
          <div className="admin-form-section">
            <h3>Images</h3>
            {isEdit && images.length > 0 && (
              <div className="image-grid">
                {images.map((img) => (
                  <div className="image-box" key={img.id}>
                    <img src={img.image_url} alt="product" />
                    {img.is_primary === 1 && <span className="image-primary-badge">Primary</span>}
                    <button type="button" className="image-delete" onClick={() => deleteImage(img)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="form-group mt-3">
              <label>Upload Images (jpg, png, webp — up to 5MB each)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="form-control"
                onChange={(e) => setNewImages(Array.from(e.target.files || []))}
              />
              {newImages.length > 0 && (
                <p className="text-dim mt-1">{newImages.length} new image(s) selected.</p>
              )}
            </div>
          </div>
        )}

        <div className="admin-form-actions">
          <button className="btn btn-gold" type="submit" disabled={saving || uploading}>
            {saving ? 'Saving…' : uploading ? 'Uploading…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <Link to="/admin/products" className="btn btn-outline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

