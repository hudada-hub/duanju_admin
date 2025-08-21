'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { request } from '@/utils/request';

interface PermissionGuardProps {
  children: React.ReactNode;
  resource: string;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({ children, resource, fallback }: PermissionGuardProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const data = await request('/user/accessible-pages');
        if (data.code === 0) {
          const accessiblePages = data.data;
          // 检查是否为超级管理员
          const isSuperAdmin = accessiblePages.includes('SUPER_ADMIN');
          
          // 如果是超级管理员，直接允许访问所有页面
          if (isSuperAdmin) {
            setHasPermission(true);
          } else {
            // 对于角色管理页面，允许ADMIN角色访问
            if (resource === 'ROLE') {
              // 检查用户是否有ADMIN角色
              const userInfo = await request('/user/profile');
              if (userInfo.code === 0 && userInfo.data?.role === 'ADMIN') {
                setHasPermission(true);
                return;
              }
            }
            // 否则检查具体资源权限
            setHasPermission(accessiblePages.includes(resource));
          }
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error('检查权限失败:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [resource]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // 默认无权限提示
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl text-gray-900 mb-4">无权限访问</h1>
          <p className="text-gray-600 mb-6">您没有访问此页面的权限</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            返回仪表盘
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 