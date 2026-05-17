const BASE_URL = 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ');
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
    } catch (_) {}
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
  
  // Special upload method for multipart forms (handles PDF uploads)
  upload: async (endpoint, formData) => {
    const token = localStorage.getItem('token');
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP error! Status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ');
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }
    return response.json();
  }
};
export default api;
