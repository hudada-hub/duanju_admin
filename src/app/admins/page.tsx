'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  EyeIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../components/layout/AdminLayout';
import { request } from '@/utils/request';
import { Notification } from '@/utils/notification';
import Link from 'next/link';

// 定义管理员列表项的类型
type AdminListItem = {
  id: number;
  nickname: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  avatar: string | null;  // 添加头像字段
};

// 定义角色信息类型
type RoleInfo = {
  id: number;
  name: string;
  description: string;
  status: string;
};

export default function AdminsPage() {
  // 状态管理
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminListItem | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  // 获取管理员列表
  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await request<AdminListItem[]>('/admins');
      if (response.code === 0 && response.data) {
        setAdmins(response.data);
      }
    } catch (error) {
      console.error('获取管理员列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取可用角色列表
  const fetchAvailableRoles = useCallback(async () => {
    try {
      const response = await request<{ items: RoleInfo[] }>('/roles');
      if (response.code === 0 && response.data && response.data.items) {
        setAvailableRoles(response.data.items);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
    }
  }, []);

  // 获取管理员的角色
  const fetchAdminRoles = useCallback(async (adminId: number) => {
    try {
      const response = await request<{ userRoles: RoleInfo[] }>(`/users/${adminId}/roles`);
      if (response.code === 0 && response.data) {
        setSelectedRoles(response.data.userRoles.map((role: RoleInfo) => role.id));
      } else {
        setSelectedRoles([]);
      }
    } catch (error) {
      console.error('获取管理员角色失败:', error);
      setSelectedRoles([]);
    }
  }, []);

  // 处理角色分配
  const handleRoleAssignment = useCallback(async (adminId: number) => {
    try {
      const response = await request(`/users/${adminId}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roleIds: selectedRoles })
      });

      if (response.code === 0) {
        Notification.success('角色分配成功');
        setIsRoleModalVisible(false);
        setSelectedAdmin(null);
        setSelectedRoles([]);
      } else {
        Notification.error(response.message || '角色分配失败');
      }
    } catch (error) {
      console.error('角色分配失败:', error);
      Notification.error('角色分配失败');
    }
  }, [selectedRoles]);

  // 打开角色分配模态框
  const openRoleModal = useCallback(async (admin: AdminListItem) => {
    setSelectedAdmin(admin);
    setIsRoleModalVisible(true);
    await fetchAvailableRoles();
    await fetchAdminRoles(admin.id);
  }, [fetchAvailableRoles, fetchAdminRoles]);

  // 获取角色标签
  const getRoleTag = useCallback((role: string) => {
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
  }, []);

  // 处理删除管理员
  const handleDeleteAdmin = async (adminId: number) => {
    if (!window.confirm('确定要删除这个管理员吗？')) {
      return;
    }

    try {
      const response = await request(`/admins/${adminId}`, {
        method: 'DELETE',
      });

      if (response.code === 0) {
        setAdmins(admins.filter(admin => admin.id !== adminId));
        Notification.success('管理员删除成功');
      }
    } catch (error) {
      console.error('删除管理员失败:', error);
      Notification.error('删除管理员失败');
    }
  };

  // 过滤管理员列表
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      const matchesSearch = admin.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (admin.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [admins, searchTerm]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题和添加按钮 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">管理员管理</h1>
            <p className="mt-2 text-sm text-gray-700">
              管理系统中的管理员账号
            </p>
          </div>
          <Link
            href="/admins/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <UserPlusIcon className="mr-2 h-5 w-5" />
            添加管理员
          </Link>
        </div>

        {/* 搜索工具栏 */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索管理员..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* 管理员列表 */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  管理员信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登录次数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后登录
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    没有找到匹配的管理员
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {admin.avatar ? (
                            <img
                              src={admin.avatar}
                              alt={admin.nickname}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                              <span>{admin.nickname.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.nickname}
                          </div>
                          {admin.email && (
                            <div className="text-sm text-gray-500">
                              {admin.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleTag(admin.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        admin.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.status === 'ACTIVE' ? '正常' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.loginCount} 次
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : '从未登录'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <Link
                          href={`/admins/${admin.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                          title="查看详情"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admins/${admin.id}/edit`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors duration-200"
                          title="编辑"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openRoleModal(admin)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors duration-200"
                          title="分配角色"
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                          title="删除"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 角色分配模态框 */}
        {isRoleModalVisible && selectedAdmin && (
          <div className="fixed inset-0 bg-black/50 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  为 {selectedAdmin.nickname} 分配角色
                </h3>
                
                <div className="space-y-3 mb-6">
                  {availableRoles.map((role: RoleInfo) => (
                    <label key={role.id} className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role.id]);
                          } else {
                            setSelectedRoles(selectedRoles.filter((id: number) => id !== role.id));
                          }
                        }}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-2">
                        <span className="text-sm font-medium text-gray-700">{role.name}</span>
                        {role.description && (
                          <div className="text-xs text-gray-500 mt-1">{role.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsRoleModalVisible(false);
                      setSelectedAdmin(null);
                      setSelectedRoles([]);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleRoleAssignment(selectedAdmin.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    确认分配
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}