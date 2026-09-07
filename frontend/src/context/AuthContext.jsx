import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStores(data.stores || []);
        
        // Retain current active store if valid, otherwise select first store
        const savedStoreId = localStorage.getItem('activeStoreId');
        if (savedStoreId && data.stores.some(s => s.id === parseInt(savedStoreId))) {
          setActiveStore(data.stores.find(s => s.id === parseInt(savedStoreId)));
        } else if (data.stores.length > 0) {
          setActiveStore(data.stores[0]);
          localStorage.setItem('activeStoreId', data.stores[0].id);
        }
      } else {
        logout();
      }
    } catch (err) {
      console.error("Auth me check failed", err);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, userData, userStores) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    setStores(userStores || []);
    if (userStores && userStores.length > 0) {
      setActiveStore(userStores[0]);
      localStorage.setItem('activeStoreId', userStores[0].id);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeStoreId');
    setToken('');
    setUser(null);
    setStores([]);
    setActiveStore(null);
  };

  const selectStore = (store) => {
    setActiveStore(store);
    if (store) {
      localStorage.setItem('activeStoreId', store.id);
    } else {
      localStorage.removeItem('activeStoreId');
    }
  };

  const refreshStores = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/stores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStores(data);
        if (activeStore) {
          const updated = data.find(s => s.id === activeStore.id);
          if (updated) setActiveStore(updated);
          else if (data.length > 0) selectStore(data[0]);
          else selectStore(null);
        } else if (data.length > 0) {
          selectStore(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      stores,
      activeStore,
      loading,
      login,
      logout,
      selectStore,
      refreshStores,
      fetchMe
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
