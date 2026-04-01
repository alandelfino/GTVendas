import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const API_BASE_URL = 'https://0d8b0788-6dc6-4c83-b907-494ffd52f0e9-00-1wy28f0g3amh1.spock.replit.dev/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token JWT
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error: AxiosError) => {
  return Promise.reject(error);
});

// Interceptor para tratar erro 401 e renovar o token
api.interceptors.response.use((response: AxiosResponse) => response, async (error: AxiosError) => {
  const originalRequest = error.config as any;
  
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        const response = await axios.post(`${API_BASE_URL}/api/mobile/refresh`, { refreshToken });
        const { accessToken } = response.data;
        
        await SecureStore.setItemAsync('accessToken', accessToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      }
    } catch (refreshError) {
      // Se falhar o refresh, removemos os tokens (logout) e redirecionamos
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      router.replace('/login');
    }
  } else if (error.response?.status === 401) {
    // Se for 401 mas não tiver refreshToken ou não for tentativa de retry, limpamos tudo
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    router.replace('/login');
  }
  
  return Promise.reject(error);
});

export default api;
