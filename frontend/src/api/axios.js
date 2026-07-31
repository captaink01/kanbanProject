// src/api/axios.js
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true,   // send cookies (refresh token) automatically
});

// In-memory access token (will be set from our auth context)
let accessToken = null;

export const setAccessToken = (token) => {
    accessToken = token;
};

// Request interceptor: attach access token if available
api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

// Response interceptor: on 401, try to refresh the token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 🚨 FIX 1: If the request that failed WITH 401 IS the /refresh-token endpoint, STOP immediately!
        if (originalRequest?.url?.includes('/refresh-token')) {
            return Promise.reject(error);
        }

        // If it's not a 401 or we already tried refreshing, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Prevent multiple simultaneous refresh attempts
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            }).catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const { data } = await api.post('/refresh-token'); // cookie sent automatically
            const newAccessToken = data.accessToken;
            setAccessToken(newAccessToken);
            processQueue(null, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);
            setAccessToken(null); // Clear stored token
            
            // 🚨 FIX 2: Only redirect if you're not already on public auth pages
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
                window.location.href = '/login';
            }
            
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;