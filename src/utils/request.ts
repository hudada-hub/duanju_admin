
import { Notification } from './notification';
import { ResponseCode, ResponseUtil } from './response';

interface RequestOptions extends RequestInit {
  token?: string;
}



export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

export async function request<T = any>(
  url: string,
  options: RequestInit = {}
) {
  const baseURL = '/api';
  const token = getToken();

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseURL}${url}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error('网络请求失败');
  }

  const data = await response.json();

  if(data.code !== ResponseCode.SUCCESS){
    // 提示通知
    Notification.error(data.message);
  }

  // 处理未授权错误
  if (data.code === ResponseCode.UNAUTHORIZED) {
    removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return data;
  }

  return data;
}