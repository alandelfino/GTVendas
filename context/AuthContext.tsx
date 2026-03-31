import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/api';

interface User {
  id: string;
  username: string;
  role: string;
  nomeCompleto: string | null;
  representanteId: string | null;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storedUser = await SecureStore.getItemAsync('user');
      const token = await SecureStore.getItemAsync('accessToken');

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    }

    loadStorageData();
  }, []);

  async function signIn(username: string, password: string) {
    try {
      const response = await api.post('/api/mobile/login', {
        username,
        password,
      });

      const { accessToken, refreshToken, user: loggedUser } = response.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(loggedUser));

      setUser(loggedUser);
    } catch (error) {
      throw new Error('Usuário ou senha inválidos.');
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
