import axios from 'axios';

// Base URL for the FastAPI backend
const BASE_URL = 'http://localhost:8000';

// Create an Axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Request interceptor to attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor to unwrap response data
api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// Helper for multipart/form-data uploads (e.g., PDF upload)
api.upload = (url, formData) => {
  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;
