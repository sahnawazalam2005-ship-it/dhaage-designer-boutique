/**
 * API client - central fetch wrapper with auth token handling.
 */
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('dhaage_token') || '';
}

function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const options = { method, headers };
  if (body !== undefined) options.body = JSON.stringify(body);

  return fetch(`${API_BASE}${path}`, options).then(async (res) => {
    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: 'Unexpected server response.' };
    }
    if (!res.ok) {
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  });
}

export const api = {
  get: (path, auth = false) => request(path, { auth }),
  post: (path, body, auth = false) => request(path, { method: 'POST', body, auth }),
  put: (path, body, auth = false) => request(path, { method: 'PUT', body, auth }),
  del: (path, auth = false) => request(path, { method: 'DELETE', auth }),

  /** Upload form data (multipart) with optional auth */
  upload(path, formData, auth = false) {
    const headers = {};
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData }).then(async (res) => {
      let data;
      try {
        data = await res.json();
      } catch {
        data = { success: false, message: 'Unexpected server response.' };
      }
      if (!res.ok) {
        const err = new Error(data.message || 'Upload failed');
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    });
  }
};

export const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const discountPercent = (price, disc) => {
  if (!price || !disc) return 0;
  return Math.round(((price - disc) / price) * 100);
};

