'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  UserIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../components/layout/AdminLayout';
import { request } from '@/utils/request';
import { Notification } from '@/utils/notification';

// 定义用户列表项的类型
type UserListItem = {
  id: number;
  username: string;
  email: string;
  status: string;
  points: number;
  createdAt: string;
  roles: RoleInfo[];
};

// 角色信息类型
type RoleInfo = {
  id: number;
  name: string;
  description: string | null;
};

// 角色数据类型
type RoleData = {
  id: number;
  name: string;
  description: string | null;
  status: string;
};

// 分页数据类型
type PaginationData = {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function UserRolesPage() {
  // 状态管理
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleData[]>([]);
  const [userRoles, setUserRoles] = useState<RoleData[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
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

      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      const response = await request<PaginationData>(`/users?${params.toString()}`);
      if (response.code === 0 && response.data) {
        // 确保每个用户对象都有 roles 字段，避免 undefined 错误
        const usersWithRoles = response.data.items.map((user: any) => ({
          ...user,
          roles: user.roles || []
        }));
        setUsers(usersWithRoles);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 获取所有可用角色
  const fetchAvailableRoles = useCallback(async () => {
    try {
      const response = await request<{ items: RoleData[] }>('/roles?status=ACTIVE');
      if (response.code === 0 && response.data) {
        setAvailableRoles(response.data.items);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchAvailableRoles();
  }, [fetchAvailableRoles]);

  // 处理查看用户角色
  const handleViewUserRoles = useCallback(async (user: UserListItem) => {
    setSelectedUser(user);
    setShowRoleModal(true);
    setRolesLoading(true);

    try {
      const response = await request(`/users/${user.id}/roles`);
      if (response.code === 0 && response.data) {
        setUserRoles(response.data.roles || []);
      }
    } catch (error) {
      console.error('获取用户角色失败:', error);
      Notification.error('获取用户角色失败');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // 处理角色更新
  const handleRolesUpdate = useCallback(async (roleIds: number[]) => {
    if (!selectedUser) return;

    try {
      const response = await request(`/users/${selectedUser.id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roleIds }),
      });

      if (response.code === 0) {
        Notification.success('角色分配更新成功');
        // 重新获取用户列表以更新显示
        fetchUsers();
        setShowRoleModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('更新角色分配失败:', error);
      Notification.error('更新角色分配失败');
    }
  }, [selectedUser, fetchUsers]);

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

  // 处理角色筛选
  const handleRoleFilter = useCallback((value: string) => {
    setRoleFilter(value);
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
      INACTIVE: { color: 'bg-gray-100 text-gray-800', text: '禁用' },
      DELETED: { color: 'bg-red-100 text-red-800', text: '已删除' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  }, []);

  // 获取角色标签
  const getRoleTags = useCallback((roles: RoleInfo[] | undefined) => {
    if (!roles || roles.length === 0) {
      return <span className="text-gray-400 text-sm">暂无角色</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {roles.map((role) => (
          <span
            key={role.id}
            className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
          >
            {role.name}
          </span>
        ))}
      </div>
    );
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">用户角色管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理用户的角色分配和权限控制
          </p>
        </div>

        {/* 搜索和筛选工具栏 */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* 筛选按钮 */}
          <div className="flex items-center space-x-2">
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
                用户状态
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
                <option value="DELETED">已删除</option>
              </select>
            </div>

            {/* 角色筛选 */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                角色类型
              </label>
              <select
                id="role"
                value={roleFilter}
                onChange={(e) => handleRoleFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">全部角色</option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 用户列表 */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  积分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注册时间
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    没有找到匹配的用户
                  </td>
                </tr>
              ) : (
                users.map((user: UserListItem) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusTag(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.points} 分
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleTags(user.roles)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewUserRoles(user)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-900"
                        title="管理角色"
                      >
                        <KeyIcon className="mr-1 h-4 w-4" />
                        管理角色
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

      {/* 角色管理模态框 */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">用户角色管理</h3>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                用户：{selectedUser.username} ({selectedUser.email})
              </p>
              <p className="text-sm text-gray-600">
                当前角色：{userRoles.length} 个
              </p>
            </div>

            {rolesLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 当前角色 */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">当前角色</h4>
                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                      {userRoles.length > 0 ? (
                        <div className="space-y-2">
                          {userRoles.map((role) => (
                            <div key={role.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{role.name}</div>
                                <div className="text-xs text-gray-500">{role.description || '暂无描述'}</div>
                              </div>
                              <button
                                onClick={() => {
                                  const newRoles = userRoles.filter(r => r.id !== role.id);
                                  setUserRoles(newRoles);
                                }}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                移除
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">暂无角色</div>
                      )}
                    </div>
                  </div>

                  {/* 可用角色 */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">可用角色</h4>
                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                      {availableRoles.length > 0 ? (
                        <div className="space-y-2">
                          {availableRoles.map((role) => (
                            <div key={role.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{role.name}</div>
                                <div className="text-xs text-gray-500">{role.description || '暂无描述'}</div>
                              </div>
                              <button
                                onClick={() => {
                                  if (!userRoles.find(r => r.id === role.id)) {
                                    setUserRoles([...userRoles, role]);
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-900 text-sm"
                                disabled={!!userRoles.find(r => r.id === role.id)}
                              >
                                {userRoles.find(r => r.id === role.id) ? '已添加' : '添加'}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">暂无可用角色</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedUser(null);
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleRolesUpdate(userRoles.map(r => r.id))}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    保存角色分配
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 