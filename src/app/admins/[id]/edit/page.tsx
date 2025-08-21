'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../components/layout/AdminLayout';
import { request } from '@/utils/request';
import { Notification } from '@/utils/notification';

type AdminDetail = {
  id: number;
  nickname: string;
  email: string | null;
  role: string;
  status: string;
  userRoles: Array<{
    id: number;
    role: {
      id: number;
      name: string;
      description: string | null;
      isEnabled: boolean;
    };
  }>;
};

type RoleInfo = {
  id: number;
  name: string;
  description: string | null;
  isEnabled: boolean;
};

export default function AdminEditPage() {
  const params = useParams();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAdminDetail();
    fetchAvailableRoles();
  }, []);

  const fetchAdminDetail = async () => {
    try {
      const response = await request<AdminDetail>(`/admins/${params.id}`);
      if (response.code === 0 && response.data) {
        setAdmin(response.data);
        // 设置已选择的角色
        if (response.data.userRoles) {
          setSelectedRoles(response.data.userRoles.map((ur: any) => ur.role.id));
        }
      }
    } catch (error) {
      console.error('获取管理员详情失败:', error);
      Notification.error('获取管理员信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const response = await request<{ items: RoleInfo[] }>('/roles');
      if (response.code === 0 && response.data && response.data.items) {
        setAvailableRoles(response.data.items);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      Notification.error('获取角色列表失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!admin) return;

    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const updateData = {
        email: formData.get('email') as string,
        roleIds: selectedRoles,
        status: formData.get('status') as string,
      };

      const response = await request(`/admins/${admin.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (response.code === 0) {
        Notification.success('管理员信息更新成功');
        router.push(`/admins/${admin.id}`);
      }
    } catch (error) {
      console.error('更新管理员失败:', error);
      Notification.error('更新管理员信息失败');
    } finally {
      setIsSaving(false);
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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">编辑管理员</h1>
          <p className="mt-2 text-sm text-gray-700">
            修改管理员的信息
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* 用户名（只读） */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              用户名
            </label>
            <input
              type="text"
              value={admin.nickname}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              defaultValue={admin.email || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* 角色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              角色
            </label>
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
              defaultValue={admin.status}
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
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 