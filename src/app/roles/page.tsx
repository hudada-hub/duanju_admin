'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../components/layout/AdminLayout';
import { request } from '@/utils/request';
import { Notification } from '@/utils/notification';

// 角色类型
type Role = {
  id: number;
  name: string;
  description: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

// 权限类型
type Permission = {
  id: number;
  name: string;
  description: string | null;
  resource: string;
  isEnabled: boolean;
};

// 角色权限类型
type RolePermission = {
  id: number;
  roleId: number;
  permissionId: number;
  permission: Permission;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await request<{ items: Role[] }>('/roles');
      if (response.code === 0 && response.data) {
        setRoles(response.data.items);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
      Notification.error('获取角色列表失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 获取权限列表
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await request<{ items: Permission[] }>('/permissions');
      if (response.code === 0 && response.data) {
        setPermissions(response.data.items);
      }
    } catch (error) {
      console.error('获取权限列表失败:', error);
    }
  }, []);

  // 获取角色权限
  const fetchRolePermissions = useCallback(async (roleId: number) => {
    try {
      console.log('获取角色权限，角色ID:', roleId);
      const response = await request(`/roles/${roleId}/permissions`);
      console.log('权限接口响应:', response);
      if (response.code === 0 && response.data) {
        console.log('设置角色权限:', response.data.rolePermissions);
        console.log('设置所有权限:', response.data.allPermissions);
        setRolePermissions(response.data.rolePermissions || []);
        setPermissions(response.data.allPermissions || []);
      }
    } catch (error) {
      console.error('获取角色权限失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // 处理创建角色
  const handleCreateRole = useCallback(async (formData: FormData) => {
    try {
      const roleData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
      };

      const response = await request('/roles', {
        method: 'POST',
        body: JSON.stringify(roleData),
      });

      if (response.code === 0) {
        setShowCreateModal(false);
        fetchRoles();
        Notification.success('角色创建成功');
      }
    } catch (error) {
      console.error('创建角色失败:', error);
      Notification.error('创建角色失败');
    }
  }, [fetchRoles]);

  // 处理编辑角色
  const handleEditRole = useCallback(async (formData: FormData) => {
    if (!editingRole) return;

    try {
      const roleData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
        isEnabled: formData.get('isEnabled') === 'true',
      };

      const response = await request(`/roles/${editingRole.id}`, {
        method: 'PUT',
        body: JSON.stringify(roleData),
      });

      if (response.code === 0) {
        setShowEditModal(false);
        setEditingRole(null);
        fetchRoles();
        Notification.success('角色更新成功');
      }
    } catch (error) {
      console.error('更新角色失败:', error);
      Notification.error('更新角色失败');
    }
  }, [editingRole, fetchRoles]);

  // 处理删除角色
  const handleDeleteRole = useCallback(async (roleId: number) => {
    if (!window.confirm('确定要删除这个角色吗？')) {
      return;
    }

    try {
      const response = await request(`/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (response.code === 0) {
        setRoles(roles.filter(role => role.id !== roleId));
        Notification.success('角色删除成功');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      Notification.error('删除角色失败');
    }
  }, [roles]);

  // 处理权限更新
  const handlePermissionUpdate = useCallback(async (roleId: number, permissionIds: number[]) => {
    try {
      const response = await request(`/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissionIds }),
      });

      if (response.code === 0) {
        setShowPermissionModal(false);
        setSelectedRole(null);
        Notification.success('权限更新成功');
      }
    } catch (error) {
      console.error('更新权限失败:', error);
      Notification.error('更新权限失败');
    }
  }, []);

  // 打开权限编辑模态框
  const openPermissionModal = useCallback(async (role: Role) => {
    setSelectedRole(role);
    setShowPermissionModal(true);
    // 获取角色权限
    await fetchRolePermissions(role.id);
  }, [fetchRolePermissions]);

  // 获取状态标签
  const getStatusTag = useCallback((isEnabled: boolean) => {
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isEnabled ? '启用' : '禁用'}
      </span>
    );
  }, []);

  return (
      <AdminLayout>
        <div className="space-y-6">
          {/* 页面标题 */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">角色管理</h1>
            <p className="mt-2 text-sm text-gray-700">
              管理系统角色和权限分配
            </p>
          </div>

          {/* 搜索和操作工具栏 */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            {/* 搜索框 */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="搜索角色..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* 新增角色按钮 */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon className="mr-2 h-5 w-5" />
              新增角色
            </button>
          </div>

          {/* 角色列表 */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      没有找到匹配的角色
                    </td>
                  </tr>
                ) : (
                  roles
                    .filter(role => 
                      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((role) => (
                      <tr key={role.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <ShieldCheckIcon className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {role.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {role.description || '暂无描述'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusTag(role.isEnabled)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(role.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openPermissionModal(role)}
                            className="text-blue-600 hover:text-blue-900 mr-2"
                            title="编辑权限"
                          >
                            <ShieldCheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRole(role);
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-2"
                            title="编辑角色"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-900"
                            title="删除角色"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 新增角色模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">新增角色</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateRole(new FormData(e.currentTarget));
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      角色名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      角色描述
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 编辑角色模态框 */}
        {showEditModal && editingRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">编辑角色</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleEditRole(new FormData(e.currentTarget));
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      角色名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingRole.name}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      角色描述
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editingRole.description || ''}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      状态
                    </label>
                    <select
                      name="isEnabled"
                      defaultValue={editingRole.isEnabled.toString()}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="true">启用</option>
                      <option value="false">禁用</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRole(null);
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 权限编辑模态框 */}
        {showPermissionModal && selectedRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">编辑角色权限</h3>
                <button
                  onClick={() => {
                    setShowPermissionModal(false);
                    setSelectedRole(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  角色：{selectedRole.name}
                </p>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {rolePermissions.length === 0 && permissions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">加载权限中...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissions.map((permission) => {
                      // 检查权限是否已分配
                      const isAssigned = rolePermissions.some(rp => 
                        rp.id === permission.id
                      );
                      return (
                        <div key={permission.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <input
                            type="checkbox"
                            id={`permission-${permission.id}`}
                            checked={isAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // 添加权限
                                setRolePermissions(prev => [...prev, {
                                  id: permission.id,
                                  roleId: selectedRole.id,
                                  permissionId: permission.id,
                                  permission
                                }]);
                              } else {
                                // 移除权限
                                setRolePermissions(prev => prev.filter(rp => rp.id !== permission.id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`permission-${permission.id}`} className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {permission.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {permission.description || '暂无描述'}
                            </div>
                            <div className="text-xs text-blue-600">
                              {permission.resource}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false);
                    setSelectedRole(null);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    const permissionIds = rolePermissions.map(rp => rp.id);
                    handlePermissionUpdate(selectedRole.id, permissionIds);
                  }}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  保存权限
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
  );
} 