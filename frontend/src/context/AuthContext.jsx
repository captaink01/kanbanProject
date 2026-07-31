import { createContext, useState, useContext, useEffect } from 'react';
import api, { setAccessToken } from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);  // true while we check for existing session

    // On mount, try to get a fresh access token using the refresh cookie
    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data } = await api.post('/refresh-token');
                setAccessToken(data.accessToken);
                // We still need user info; either decode the token or make a /me request.
                // A simple way: decode the JWT on the frontend (it's not secret).
                const base64Url = data.accessToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                setUser({ id: payload.userId, email: payload.email });
            } catch (err) {
                // No valid refresh token, stay logged out
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/login', { email, password });
        setAccessToken(data.accessToken);
        const base64Url = data.accessToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        setUser({ id: payload.userId, email: payload.email });
    };

    const signup = async (email, password) => {
        await api.post('/signup', { email, password });
        // After signup, automatically log in
        await login(email, password);
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (err) {
            console.error(err);
        }
        setAccessToken(null);
        setUser(null);
    };

    const value = { user, login, signup, logout, loading };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};