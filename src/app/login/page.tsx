'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { request, setToken, getToken } from '@/utils/request';
import { ResponseUtil } from '@/utils/response';
import { LoginRequest, LoginResponseData } from '@/types/auth';
import { getUserAuth } from '@/utils/client-auth';
import { jwtDecode } from 'jwt-decode';

const LoginPage: React.FC = () => {
  const [nickname, setnickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 检查是否已登录
  useEffect(() => {
    const token = getToken();
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
  
    try {
      const loginData: LoginRequest = {
        nickname,
        password
      };

      const response = await request<LoginResponseData>('/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });
  
      if (response.code === 0 && response.data) {
        setToken(response.data.token);

  
        // 解析token数据
        const decodedToken:{
          id: number;
          nickname: string;
          role: string;
          avatar: string;
        } = jwtDecode(response.data.token);
        localStorage.setItem('userInfo', JSON.stringify(decodedToken));
        router.push('/dashboard');
      } else {
        setError(response.message || '登录失败，请检查用户名和密码');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">管理员登录</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">用户名</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setnickname(e.target.value)}
            className="border border-gray-300 rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={isLoading}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={isLoading}
          />
        </div>
        <button 
          type="submit" 
          className={`bg-blue-500 text-white rounded px-4 py-2 w-full transition duration-200 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
          disabled={isLoading}
        >
          {isLoading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;