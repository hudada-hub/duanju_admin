'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 检查登录状态
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // 调用验证接口检查登录状态
      const token = localStorage.getItem('token');
      if (token) {
        // 已登录，跳转到仪表盘
        router.replace('/dashboard');
      } else {
        // 未登录，跳转到登录页
        router.replace('/login');
      }
    } catch (error) {
      // 发生错误时，跳转到登录页
      console.error('验证登录状态失败:', error);
      router.replace('/login');
    }
  };

  // 返回一个加载中的界面，因为会立即重定向
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-500">加载中...</div>
    </div>
  );
}