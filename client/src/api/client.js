import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor for attaching auth token if stored in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartcart_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for unified error parsing
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(customMessage));
  }
);

export default api;
