'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '../../components/layout/AdminLayout';
import { request } from '@/utils/request';
import Link from 'next/link';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

type AdminDetail = {
  id: number;
  nickname: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  lastLoginIp: string | null;
  avatar: string | null;
};

export default function AdminDetailPage() {
  const params = useParams();
  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 获取角色标签
  const getRoleTag = (role: string) => {
    const roleMap = {
      SUPER_ADMIN: { color: 'bg-purple-100 text-purple-800', text: '超级管理员' },
      ADMIN: { color: 'bg-blue-100 text-blue-800', text: '管理员' },
    };
    
    const roleInfo = roleMap[role as keyof typeof roleMap] || { color: 'bg-gray-100 text-gray-800', text: role };
    return (
      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${roleInfo.color}`}>
        {roleInfo.text}
      </span>
    );
  };

  useEffect(() => {
    fetchAdminDetail();
  }, []);

  const fetchAdminDetail = async () => {
    try {
      const response = await request<AdminDetail>(`/admins/${params.id}`);
      if (response.code === 0 && response.data) {
        setAdmin(response.data);
      }
    } catch (error) {
      console.error('获取管理员详情失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">加载中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!admin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">管理员不存在</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题和编辑按钮 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">管理员详情</h1>
            <p className="mt-2 text-sm text-gray-700">
              查看管理员的详细信息
            </p>
          </div>
          <Link
            href={`/admins/${admin.id}/edit`}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PencilSquareIcon className="mr-2 h-5 w-5" />
            编辑
          </Link>
        </div>

        {/* 详细信息 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <div className="h-20 w-20 flex-shrink-0">
                {admin.avatar ? (
                  <img
                    src={admin.avatar}
                    alt={admin.nickname}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl">
                    <span>{admin.nickname.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="ml-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  基本信息
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  管理员个人详细信息
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">用户名</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {admin.nickname}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">昵称</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {admin.nickname || '未设置'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">手机号</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {admin.phone || '未设置'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">邮箱</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {admin.email || '未设置'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">角色</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {getRoleTag(admin.role)}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">状态</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    admin.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {admin.status === 'ACTIVE' ? '正常' : '禁用'}
                  </span>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">注册时间</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(admin.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">最后登录时间</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : '从未登录'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">登录次数</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {admin.loginCount} 次
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">最后登录IP</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {admin.lastLoginIp || '未知'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 