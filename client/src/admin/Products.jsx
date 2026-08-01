import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const toast = useToast();

  const loadProducts = (qs = '') => {
    setLoading(true);
    api.get(`/products${qs}`).then((d) => setProducts(d.products)).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {});
    loadProducts();
  }, []);

  const applyFilters = () => {
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (categoryFilter) qs.set('category', categoryFilter);
    loadProducts(`?${qs.toString()}`);
  };

  const toggleStock = async (p) => {
    try {
      await api.put(`/products/${p.id}`, { in_stock: p.in_stock ? 0 : 1 }, true);
      toast.success(`${p.name} marked ${p.in_stock ? 'out of stock' : 'in stock'}.`);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleFeatured = async (p) => {
    try {
      await api.put(`/products/${p.id}`, { featured: p.featured ? 0 : 1 }, true);
      toast.success(`${p.name} ${p.featured ? 'removed from' : 'added to'} featured.`);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteProduct = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/products/${p.id}`, true);
      toast.success(`${p.name} deleted.`);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = products.filter((p) => {
    if (stockFilter === 'in' && !p.in_stock) return false;
    if (stockFilter === 'out' && p.in_stock) return false;
    if (stockFilter === 'low' && !(p.in_stock && p.stock < 5)) return false;
    return true;
  });

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h2>Products</h2>
        <Link to="/admin/products/new" className="btn btn-gold btn-sm">+ Add Product</Link>
      </div>

      <div className="admin-toolbar">
        <input
          className="form-control admin-search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
        />
        <select className="form-control" style={{ width: 180 }} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); loadProducts(e.target.value ? `?category=${e.target.value}` : ''); }}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select className="form-control" style={{ width: 160 }} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option value="">All Stock</option>
          <option value="in">In Stock</option>
          <option value="out">Out of Stock</option>
          <option value="low">Low ({'<'}5)</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={applyFilters}>Apply</button>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No products found.</div>
      ) : (
        <div className="table-wrap card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="product-admin-card">
                      <img className="product-admin-img" src={p.image} alt={p.name} />
                      <div className="product-admin-info">
                        <div className="product-admin-name">{p.name}</div>
                        <div className="product-admin-meta">SKU #{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category_name || '—'}</td>
                  <td>
                    <div className="product-admin-price">
                      <span className="price-now-admin">{formatINR(p.discounted_price || p.price)}</span>
                      {p.discounted_price && <span className="price-old-admin">{formatINR(p.price)}</span>}
                    </div>
                  </td>
                  <td>
                    {p.in_stock ? (
                      <span style={{ color: 'var(--success)' }}>● {p.stock} in stock</span>
                    ) : (
                      <span style={{ color: 'var(--danger)' }}>● Out of stock</span>
                    )}
                  </td>
                  <td>
                    <div className="product-admin-badges">
                      {p.featured === 1 && <span className="badge-outline featured">★ Featured</span>}
                      {p.discounted_price && <span className="badge-outline">Sale</span>}
                    </div>
                  </td>
                  <td>
                    <div className="actions">
                      <Link to={`/admin/products/${p.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                      <button className="btn btn-outline btn-sm" onClick={() => toggleFeatured(p)}>
                        {p.featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => toggleStock(p)}>
                        {p.in_stock ? 'Out' : 'In'}
                      </button>
                      <button className="btn btn-dark btn-sm" onClick={() => deleteProduct(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

