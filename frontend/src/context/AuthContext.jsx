import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('steg_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
        .then(r => { setUser(r.data.user); applyTheme(r.data.user.theme_preference); })
        .catch(() => { localStorage.removeItem('steg_token'); delete axios.defaults.headers.common['Authorization']; })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme || 'light');
  };

  const login = async (email, password) => {
    const r = await axios.post('/api/auth/login', { email, password });
    const { token, user } = r.data;
    localStorage.setItem('steg_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    applyTheme(user.theme_preference);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('steg_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    document.documentElement.setAttribute('data-theme', 'light');
  };

  const toggleTheme = async () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    setUser(u => ({ ...u, theme_preference: newTheme }));
    try { await axios.put('/api/auth/theme', { theme: newTheme }); } catch {}
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, toggleTheme }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
