'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../components/layout/AdminLayout';
import { request } from '@/utils/request';
import { Notification } from '@/utils/notification';

// 定义权限列表项的类型
type PermissionListItem = {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// 编辑权限的数据类型
type EditPermissionData = {
  name: string;
  resource: string;
  action: string;
  description?: string;
  status: string;
};

// 新增权限的数据类型
type CreatePermissionData = {
  name: string;
  resource: string;
  action: string;
  description?: string;
  status: string;
};

// 分页数据类型
type PaginationData = {
  items: PermissionListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function PermissionsPage() {
  // 状态管理
  const [permissions, setPermissions] = useState<PermissionListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionListItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 获取权限列表
  const fetchPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 构建查询参数
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString()
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (resourceFilter !== 'all') {
        params.append('resource', resourceFilter);
      }

      const response = await request<PaginationData>(`/permissions?${params.toString()}`);
      if (response.code === 0 && response.data) {
        setPermissions(response.data.items);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error('获取权限列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, resourceFilter]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // 处理权限状态更改
  const handleStatusChange = useCallback(async (permissionId: number, newStatus: string) => {
    try {
      const response = await request(`/permissions/${permissionId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.code === 0) {
        // 更新本地状态
        setPermissions(permissions.map(permission => 
          permission.id === permissionId ? { ...permission, status: newStatus } : permission
        ));
        Notification.success('状态更新成功');
      }
    } catch (error) {
      console.error('更新权限状态失败:', error);
      Notification.error('更新状态失败');
    }
  }, [permissions]);

  // 处理删除权限
  const handleDeletePermission = useCallback(async (permissionId: number) => {
    if (!window.confirm('确定要删除这个权限吗？')) {
      return;
    }

    try {
      const response = await request(`/permissions/${permissionId}`, {
        method: 'DELETE',
      });

      if (response.code === 0) {
        setPermissions(permissions.filter(permission => permission.id !== permissionId));
        Notification.success('权限删除成功');
      } else {
        Notification.error(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除权限失败:', error);
      Notification.error('删除权限失败');
    }
  }, [permissions]);

  // 处理编辑权限
  const handleEditPermission = useCallback(async (permissionData: EditPermissionData) => {
    if (!editingPermission) return;

    try {
      const response = await request(`/permissions/${editingPermission.id}`, {
        method: 'PUT',
        body: JSON.stringify(permissionData),
      });

      if (response.code === 0) {
        setPermissions(permissions.map(permission => 
          permission.id === editingPermission.id ? { ...permission, ...permissionData } : permission
        ));
        setShowEditModal(false);
        setEditingPermission(null);
        Notification.success('权限信息更新成功');
      }
    } catch (error) {
      console.error('更新权限信息失败:', error);
      Notification.error('更新权限信息失败');
    }
  }, [editingPermission, permissions]);

  // 处理新增权限
  const handleCreatePermission = useCallback(async (permissionData: CreatePermissionData) => {
    try {
      const response = await request('/permissions', {
        method: 'POST',
        body: JSON.stringify(permissionData),
      });

      if (response.code === 0) {
        setShowCreateModal(false);
        fetchPermissions(); // 重新获取权限列表
        Notification.success('权限创建成功');
      }
    } catch (error) {
      console.error('创建权限失败:', error);
      Notification.error('创建权限失败');
    }
  }, [fetchPermissions]);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // 重置到第一页
  }, []);

  // 处理状态筛选
  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // 重置到第一页
  }, []);

  // 处理资源筛选
  const handleResourceFilter = useCallback((value: string) => {
    setResourceFilter(value);
    setCurrentPage(1); // 重置到第一页
  }, []);

  // 处理页码变化
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 处理每页数量变化
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // 重置到第一页
  }, []);

  // 获取状态标签
  const getStatusTag = useCallback((status: string) => {
    const statusMap = {
      ACTIVE: { color: 'bg-green-100 text-green-800', text: '活跃' },
      INACTIVE: { color: 'bg-gray-100 text-gray-800', text: '禁用' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  }, []);

  // 获取资源标签
  const getResourceTag = useCallback((resource: string) => {
    const resourceMap = {
      USER: { color: 'bg-blue-100 text-blue-800', text: '用户管理' },
      ROLE: { color: 'bg-purple-100 text-purple-800', text: '角色管理' },
      PERMISSION: { color: 'bg-indigo-100 text-indigo-800', text: '权限管理' },
      COURSE: { color: 'bg-green-100 text-green-800', text: '短剧管理' },
      FORUM: { color: 'bg-yellow-100 text-yellow-800', text: '论坛管理' },
      TASK: { color: 'bg-orange-100 text-orange-800', text: '任务管理' },
      ORDER: { color: 'bg-red-100 text-red-800', text: '订单管理' },
      GAME: { color: 'bg-pink-100 text-pink-800', text: '游戏管理' }
    };
    
    const resourceInfo = resourceMap[resource as keyof typeof resourceMap] || { color: 'bg-gray-100 text-gray-800', text: resource };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${resourceInfo.color}`}>
        {resourceInfo.text}
      </span>
    );
  }, []);

  // 获取操作标签
  const getActionTag = useCallback((action: string) => {
    const actionMap = {
      CREATE: { color: 'bg-green-100 text-green-800', text: '创建' },
      READ: { color: 'bg-blue-100 text-blue-800', text: '查看' },
      UPDATE: { color: 'bg-yellow-100 text-yellow-800', text: '更新' },
      DELETE: { color: 'bg-red-100 text-red-800', text: '删除' },
      MANAGE: { color: 'bg-purple-100 text-purple-800', text: '管理' }
    };
    
    const actionInfo = actionMap[action as keyof typeof actionMap] || { color: 'bg-gray-100 text-gray-800', text: action };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${actionInfo.color}`}>
        {actionInfo.text}
      </span>
    );
  }, []);

  // 获取可用的资源选项
  const availableResources = useMemo(() => [
    { value: 'USER', label: '用户管理' },
    { value: 'ROLE', label: '角色管理' },
    { value: 'PERMISSION', label: '权限管理' },
    { value: 'COURSE', label: '短剧管理' },
    { value: 'FORUM', label: '论坛管理' },
    { value: 'TASK', label: '任务管理' },
    { value: 'ORDER', label: '订单管理' },
    { value: 'GAME', label: '游戏管理' }
  ], []);

  // 获取可用的操作选项
  const availableActions = useMemo(() => [
    { value: 'CREATE', label: '创建' },
    { value: 'READ', label: '查看' },
    { value: 'UPDATE', label: '更新' },
    { value: 'DELETE', label: '删除' },
    { value: 'MANAGE', label: '管理' }
  ], []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">权限管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理系统中的权限配置
          </p>
        </div>

        {/* 搜索和筛选工具栏 */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索权限名称..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* 操作按钮组 */}
          <div className="flex items-center space-x-2">
            {/* 新增权限按钮 */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon className="mr-2 h-5 w-5" />
              新增权限
            </button>
            
            {/* 筛选按钮 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FunnelIcon className="mr-2 h-5 w-5 text-gray-400" />
              筛选
            </button>
          </div>
        </div>

        {/* 筛选选项 */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 状态筛选 */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                状态
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="ACTIVE">活跃</option>
                <option value="INACTIVE">禁用</option>
              </select>
            </div>

            {/* 资源筛选 */}
            <div>
              <label htmlFor="resource" className="block text-sm font-medium text-gray-700">
                资源类型
              </label>
              <select
                id="resource"
                value={resourceFilter}
                onChange={(e) => handleResourceFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">全部资源</option>
                {availableResources.map(resource => (
                  <option key={resource.value} value={resource.value}>
                    {resource.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 权限列表 */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  权限信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  资源类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作类型
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
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    没有找到匹配的权限
                  </td>
                </tr>
              ) : (
                permissions.map((permission: PermissionListItem) => (
                  <tr key={permission.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {permission.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {permission.description ? (
                              <div className="truncate max-w-xs">{permission.description}</div>
                            ) : (
                              <span className="text-gray-400">暂无描述</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getResourceTag(permission.resource)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionTag(permission.action)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={permission.status}
                        onChange={(e) => handleStatusChange(permission.id, e.target.value)}
                        className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="ACTIVE">活跃</option>
                        <option value="INACTIVE">禁用</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(permission.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingPermission(permission);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        title="编辑权限"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePermission(permission.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除权限"
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

        {/* 分页组件 */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                每页显示
              </span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">
                条记录
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                第 {currentPage} 页，共 {totalPages} 页，总计 {total} 条记录
              </span>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ←
                </button>
                
                {/* 页码按钮 */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 编辑权限模态框 */}
      {showEditModal && editingPermission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">编辑权限信息</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEditPermission({
                name: formData.get('name') as string,
                resource: formData.get('resource') as string,
                action: formData.get('action') as string,
                description: formData.get('description') as string || undefined,
                status: formData.get('status') as string,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    权限名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingPermission.name}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    资源类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="resource"
                    defaultValue={editingPermission.resource}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {availableResources.map(resource => (
                      <option key={resource.value} value={resource.value}>
                        {resource.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    操作类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="action"
                    defaultValue={editingPermission.action}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {availableActions.map(action => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    描述
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingPermission.description || ''}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    状态
                  </label>
                  <select
                    name="status"
                    defaultValue={editingPermission.status}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">活跃</option>
                    <option value="INACTIVE">禁用</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPermission(null);
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

      {/* 新增权限模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">新增权限</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreatePermission({
                name: formData.get('name') as string,
                resource: formData.get('resource') as string,
                action: formData.get('action') as string,
                description: formData.get('description') as string || undefined,
                status: formData.get('status') as string,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    权限名称 <span className="text-red-500">*</span>
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
                    资源类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="resource"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {availableResources.map(resource => (
                      <option key={resource.value} value={resource.value}>
                        {resource.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    操作类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="action"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {availableActions.map(action => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    描述
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    状态
                  </label>
                  <select
                    name="status"
                    defaultValue="ACTIVE"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">活跃</option>
                    <option value="INACTIVE">禁用</option>
                  </select>
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
    </AdminLayout>
  );
} 