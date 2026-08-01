import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './admin.css';

export default function AdminLogin() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required.';
    if (!password) errs.password = 'Password is required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const data = await login(email, password);
      if (data.user.role !== 'admin') {
        toast.error('Access denied. Admin credentials required.');
        return;
      }
      toast.success('Welcome back, Admin!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Login | Dhaage Designer</title>
      </Helmet>

      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-brand">
            <span className="brand-mark">D</span>
            <h1>Dhaage Admin</h1>
            <p>Secure admin access</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: '' })); }}
                placeholder="admin@dhaage.com"
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: '' })); }}
                placeholder="Enter admin password"
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
            <button className="btn btn-gold btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Verifying…' : 'Login to Dashboard'}
            </button>
          </form>

          <p className="admin-login-hint">
            Default credentials are set in <code>server/.env</code>.
          </p>
        </div>
      </div>
    </>
  );
}

