import { config } from './config.js';

async function request(path, token, options = {}) {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `Request failed with status ${response.status}`);
  }
  return payload;
}

export const api = {
  dashboard: (token) => request('/api/dashboard', token),
  listCustomers: (token, search = '') => request(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`, token),
  createCustomer: (token, data) => request('/api/customers', token, { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (token, id, data) => request(`/api/customers/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (token, id) => request(`/api/customers/${id}`, token, { method: 'DELETE' }),
  listContacts: (token, customerId = '') => request(`/api/contacts${customerId ? `?customerId=${customerId}` : ''}`, token),
  createContact: (token, data) => request('/api/contacts', token, { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (token, id, data) => request(`/api/contacts/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (token, id) => request(`/api/contacts/${id}`, token, { method: 'DELETE' }),
  listDeals: (token, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.customerId) params.set('customerId', filters.customerId);
    if (filters.stage) params.set('stage', filters.stage);
    return request(`/api/deals${params.toString() ? `?${params.toString()}` : ''}`, token);
  },
  createDeal: (token, data) => request('/api/deals', token, { method: 'POST', body: JSON.stringify(data) }),
  updateDeal: (token, id, data) => request(`/api/deals/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeal: (token, id) => request(`/api/deals/${id}`, token, { method: 'DELETE' })
};
