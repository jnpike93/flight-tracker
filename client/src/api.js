const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Token Management
export function getToken() {
  return localStorage.getItem('aerolog_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('aerolog_token', token);
  } else {
    localStorage.removeItem('aerolog_token');
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('aerolog_user');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('aerolog_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('aerolog_user');
  }
}

export function clearSession() {
  localStorage.removeItem('aerolog_token');
  localStorage.removeItem('aerolog_user');
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// ================= AUTH API =================

export async function fetchAuthConfig() {
  const res = await fetch(`${API_BASE}/auth/config`);
  if (!res.ok) throw new Error('Failed to load auth config');
  return res.json();
}

export async function loginWithGoogle(credential) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  });
  const data = await res.json();

  if (data.status === 'PENDING_APPROVAL') {
    return data;
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Google sign-in failed');
  }

  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function loginWithDev(email, name) {
  const res = await fetch(`${API_BASE}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name })
  });
  const data = await res.json();

  if (data.status === 'PENDING_APPROVAL') {
    return data;
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Sign-in failed');
  }

  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function fetchCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    clearSession();
    throw new Error('Session invalid');
  }
  return res.json();
}

export async function fetchAllowedUsers() {
  const res = await fetch(`${API_BASE}/auth/allowed-users`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load allowed users');
  return res.json();
}

export async function addAllowedUser(email, name) {
  const res = await fetch(`${API_BASE}/auth/allowed-users`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, name })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add user');
  return data;
}

export async function removeAllowedUser(email) {
  const res = await fetch(`${API_BASE}/auth/allowed-users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to remove user');
  return data;
}

// ================= FLIGHTS API =================

export async function fetchFlights(params = {}) {
  const query = new URLSearchParams();
  if (params.year && params.year !== 'all') query.set('year', params.year);
  if (params.airline && params.airline !== 'all') query.set('airline', params.airline);
  if (params.search) query.set('search', params.search);

  const res = await fetch(`${API_BASE}/flights?${query.toString()}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) clearSession();
    throw new Error('Failed to load flights');
  }
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) clearSession();
    throw new Error('Failed to load stats');
  }
  return res.json();
}

export async function searchAirports(q) {
  const res = await fetch(`${API_BASE}/airports/search?q=${encodeURIComponent(q || '')}`);
  if (!res.ok) throw new Error('Failed to search airports');
  return res.json();
}

export async function lookupFlightNumber(flightNumber) {
  const res = await fetch(`${API_BASE}/flights/lookup/${encodeURIComponent(flightNumber)}`);
  if (!res.ok) throw new Error('Failed to lookup flight number');
  return res.json();
}

export async function addFlight(flightData) {
  const res = await fetch(`${API_BASE}/flights`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(flightData)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to add flight' }));
    throw new Error(error.error || 'Failed to add flight');
  }
  return res.json();
}

export async function updateFlight(id, flightData) {
  const res = await fetch(`${API_BASE}/flights/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(flightData)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update flight' }));
    throw new Error(error.error || 'Failed to update flight');
  }
  return res.json();
}

export async function deleteFlight(id) {
  const res = await fetch(`${API_BASE}/flights/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete flight');
  return res.json();
}

export async function clearAllFlights() {
  const res = await fetch(`${API_BASE}/flights`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to clear flights');
  return res.json();
}

export async function resetSampleFlights() {
  const res = await fetch(`${API_BASE}/reset-samples`, {
    method: 'POST',
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to reset samples');
  return res.json();
}

export async function importFlights(flightsArray) {
  const res = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(flightsArray)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(error.error || 'Import failed');
  }
  return res.json();
}

// ================= CALENDAR SYNC API =================

export async function scanGoogleCalendar(accessToken, timeMin, timeMax, query = '') {
  const res = await fetch(`${API_BASE}/calendar/scan-google`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ accessToken, timeMin, timeMax, query })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to scan Google Calendar');
  }
  return data;
}

export async function scanICSCalendar(icsContent) {
  const res = await fetch(`${API_BASE}/calendar/scan-ics`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ icsContent })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to parse calendar file');
  }
  return data;
}

export async function confirmCalendarImport(flights) {
  const res = await fetch(`${API_BASE}/calendar/confirm-import`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ flights })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to import flights');
  }
  return data;
}

// Download authenticated JSON export
export async function downloadFlightExport() {
  const res = await fetch(`${API_BASE}/export`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error('Failed to export flight records');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aerolog_flight_export_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Parse Boarding Pass
export async function parseBoardingPass(rawText) {
  const res = await fetch(`${API_BASE}/flights/parse-boarding-pass`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ rawText: (rawText || '').trim() })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to parse boarding pass');
  }
  return data;
}

// ================= ADMIN CONSOLE API =================

export async function fetchAdminUsers() {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch admin users');
  }
  return data;
}

export async function fetchAdminUserFlights(email) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}/flights`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch user flights');
  }
  return data;
}

export async function addAdminUser(email, name, role = 'user') {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, name, role })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to add user');
  }
  return data;
}

export async function updateAdminUserRole(email, role) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}/role`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ role })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to update user role');
  }
  return data;
}

export async function removeAdminUser(email) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to remove user');
  }
  return data;
}

export async function updateAdminUserStatus(email, status) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}/status`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to update user approval status');
  }
  return data;
}

export async function deleteAdminUserFlights(email) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}/flights`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to purge user flights');
  }
  return data;
}


