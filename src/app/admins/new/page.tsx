'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/layout/AdminLayout';
import { request } from '@/utils/request';
import { Notification } from '@/utils/notification';

type RoleInfo = {
  id: number;
  name: string;
  description: string | null;
  isEnabled: boolean;
};

export default function AdminNewPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // 获取可用角色列表
  const fetchAvailableRoles = useCallback(async () => {
    try {
      setRolesLoading(true);
      const response = await request<{ items: RoleInfo[] }>('/roles');
      if (response.code === 0 && response.data && response.data.items) {
        setAvailableRoles(response.data.items);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      Notification.error('获取角色列表失败');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // 组件加载时获取角色列表
  useEffect(() => {
    fetchAvailableRoles();
  }, [fetchAvailableRoles]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      const newAdminData = {
        nickname: formData.get('nickname') as string,
        password: formData.get('password') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        roleIds: selectedRoles,
        status: formData.get('status') as string,
      };

      const response = await request('/admins', {
        method: 'POST',
        body: JSON.stringify(newAdminData),
      });

      if (response.code === 0) {
        Notification.success('管理员创建成功');
        router.push('/admins');
      }
    } catch (error) {
      console.error('创建管理员失败:', error);
      Notification.error('创建管理员失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">新增管理员</h1>
          <p className="mt-2 text-sm text-gray-700">
            创建一个新的管理员账号
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* 用户名 */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
              用户名
            </label>
            <input
              type="text"
              name="nickname"
              id="nickname"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* 密码 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <input
              type="password"
              name="password"
              id="password"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* 邮箱 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              邮箱
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* 手机号 */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              手机号
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              required
              pattern="^1[3-9]\d{9}$"
              placeholder="请输入11位手机号"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* 角色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              角色
            </label>
            {rolesLoading ? (
              <div className="text-gray-500">加载中...</div>
            ) : availableRoles.length > 0 ? (
              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <label key={role.id} className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role.id]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                        }
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{role.name}</div>
                      {role.description && (
                        <div className="text-sm text-gray-500 mt-1">{role.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">暂无可用角色</div>
            )}
            {selectedRoles.length === 0 && (
              <p className="mt-1 text-sm text-red-600">请至少选择一个角色</p>
            )}
          </div>

          {/* 状态 */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              状态
            </label>
            <select
              id="status"
              name="status"
              required
              defaultValue="active"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="ACTIVE">正常</option>
              <option value="INACTIVE">禁用</option>
            </select>
          </div>

          {/* 按钮组 */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSaving ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 