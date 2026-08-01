import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import './Shop.css';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name A–Z' }
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const category = params.get('category') || '';
  const search = params.get('search') || '';
  const sort = params.get('sort') || 'newest';

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(search);
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (search) qs.set('search', search);
    if (sort) qs.set('sort', sort);
    if (maxPrice) qs.set('max', maxPrice);

    api.get(`/products?${qs.toString()}`)
      .then((d) => setProducts(d.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, search, sort, maxPrice]);

  const updateParam = useCallback((key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const activeCat = categories.find((c) => c.slug === category);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setMaxPrice('');
    navigate('/shop');
  };

  return (
    <>
      <Helmet>
        <title>{category ? `${activeCat?.name || 'Category'} | Dhaage Designer` : 'Shop Menswear | Dhaage Designer'}</title>
        <meta name="description" content="Browse premium sherwanis, suits, blazers, kurtas and indo-western wear at Dhaage Designer Boutique." />
      </Helmet>

      <div className="page container">
        <div className="shop-head">
          <div>
            <h1 className="page-title">{activeCat?.name || (search ? `Search: "${search}"` : 'All Products')}</h1>
            <p className="page-subtitle">
              {products.length} {products.length === 1 ? 'piece' : 'pieces'} of premium menswear
            </p>
          </div>
          <div className="shop-sort">
            <label htmlFor="sort">Sort by</label>
            <select
              id="sort"
              className="form-control"
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="shop-layout">
          {/* Sidebar filters */}
          <aside className="filters">
            <div className="card">
              <h3 className="filter-title">Categories</h3>
              <div className="filter-list">
                <button
                  className={`filter-item ${!category ? 'active' : ''}`}
                  onClick={() => updateParam('category', '')}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={`filter-item ${category === c.slug ? 'active' : ''}`}
                    onClick={() => updateParam('category', c.slug)}
                  >
                    {c.name}
                    <span className="filter-count">{c.product_count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="filter-title">Search</h3>
              <form onSubmit={handleSearchSubmit}>
                <input
                  className="form-control"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search products..."
                />
              </form>
            </div>

            <div className="card">
              <h3 className="filter-title">Max Price</h3>
              <input
                className="form-control"
                type="number"
                min="0"
                step="500"
                placeholder="e.g. 15000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <button className="btn btn-outline btn-block" onClick={clearFilters}>
              Clear All Filters
            </button>
          </aside>

          {/* Product grid */}
          <div className="shop-products">
            {loading ? (
              <Loading />
            ) : products.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🧵</div>
                <h3>No products found</h3>
                <p className="text-muted mt-2">Try adjusting your search or filters.</p>
                <button className="btn btn-gold mt-3" onClick={clearFilters}>Clear Filters</button>
              </div>
            ) : (
              <div className="grid grid-3">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} delay={i * 0.05} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

