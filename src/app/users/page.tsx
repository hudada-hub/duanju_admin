'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PencilSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '../components/layout/AdminLayout';
import { request } from '@/utils/request';
import { Notification } from '@/utils/notification';

// 定义用户列表项的类型
type UserListItem = {
  id: number;
  nickname: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  avatar: string | null;
  points: number;
  studyTime: number;
};

// 编辑用户的类型
type EditUserData = {
  email?: string;
  status?: string;
  points?: number;
};

// 新增用户的类型
type CreateUserData = {
  nickname: string;
  phone: string;
  password: string;
  email?: string;
  points?: number;
};

// 分页数据类型
type PaginationData = {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function UsersPage() {
  // 状态管理
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsUser, setPointsUser] = useState<UserListItem | null>(null);
  const [pointsChange, setPointsChange] = useState(0);
  const [pointsReason, setPointsReason] = useState('');
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [ordersUser, setOrdersUser] = useState<UserListItem | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
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

      const response = await request<PaginationData>(`/users?${params.toString()}`);
      if (response.code === 0 && response.data) {
        setUsers(response.data.items);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 处理用户状态更改
  const handleStatusChange = async (userId: number, newStatus: string) => {
    try {
      const response = await request(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.code === 0) {
        // 更新本地状态
        setUsers(users.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        ));
        Notification.success('状态更新成功');
      }
    } catch (error) {
      console.error('更新用户状态失败:', error);
      Notification.error('更新状态失败');
    }
  };



  // 处理编辑用户
  const handleEditUser = useCallback(async (userData: EditUserData) => {
    if (!editingUser) return;

    try {
      const response = await request(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });

      if (response.code === 0) {
        setUsers(users.map(user => 
          user.id === editingUser.id ? { ...user, ...userData } : user
        ));
        setShowEditModal(false);
        setEditingUser(null);
        Notification.success('用户信息更新成功');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      Notification.error('更新用户信息失败');
    }
  }, [editingUser, users]);

  // 处理新增用户
  const handleCreateUser = useCallback(async (userData: CreateUserData) => {
    try {
      const response = await request('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (response.code === 0) {
        setShowCreateModal(false);
        fetchUsers(); // 重新获取用户列表
        Notification.success('用户创建成功');
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      Notification.error('创建用户失败');
    }
  }, [fetchUsers]);

  // 处理积分修改
  const handlePointsChange = useCallback(async () => {
    if (!pointsUser || pointsChange === 0) return;

    try {
      const response = await request(`/users/${pointsUser.id}/points`, {
        method: 'PUT',
        body: JSON.stringify({
          change: pointsChange,
          reason: pointsReason
        }),
      });

      if (response.code === 0) {
        setUsers(users.map(user => 
          user.id === pointsUser.id ? { ...user, points: user.points + pointsChange } : user
        ));
        setShowPointsModal(false);
        setPointsUser(null);
        setPointsChange(0);
        setPointsReason('');
        Notification.success('积分修改成功');
      }
    } catch (error) {
      console.error('修改积分失败:', error);
      Notification.error('修改积分失败');
    }
  }, [pointsUser, pointsChange, pointsReason, users]);

  // 获取用户订单
  const handleViewOrders = useCallback(async (user: UserListItem) => {
    setOrdersUser(user);
    setShowOrdersModal(true);
    setOrdersLoading(true);
    
    try {
      const response = await request(`/orders?userId=${user.id}&page=1&pageSize=50`);
      if (response.code === 0) {
        setUserOrders(response.data.items || []);
      }
    } catch (error) {
      console.error('获取用户订单失败:', error);
      Notification.error('获取用户订单失败');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // 查看用户前台资料
  const handleViewUserProfile = useCallback((userId: number) => {
    const frontUrl = process.env.NEXT_PUBLIC_FRONT_BASE_URL;
    if (frontUrl) {
      window.open(`${frontUrl}/profile/${userId}`, '_blank');
    } else {
      // 如果没有配置前台地址，使用默认地址
      window.open(`http://localhost:3100/profile/${userId}`, '_blank');
    }
  }, []);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理状态筛选
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理每页数量变化
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // 重置到第一页
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">用户管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理系统中的普通用户账号
          </p>
        </div>

        {/* 搜索和筛选工具栏 */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索用户..."
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
            {/* 新增用户按钮 */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon className="mr-2 h-5 w-5" />
              新增用户
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <option value="ACTIVE">正常</option>
                <option value="INACTIVE">禁用</option>
                <option value="DELETED">删除</option>
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
                  积分/学习时长
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后登录
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
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.nickname}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                              <span>{user.nickname.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.nickname}
                          </div>
                          <div className="text-sm text-gray-500 space-y-1">
                            {user.email && (
                              <div>{user.email}</div>
                            )}
                            {user.phone && (
                              <div>📞 {user.phone}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                                          <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.id, e.target.value)}
                      className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">正常</option>
                      <option value="INACTIVE">禁用</option>
                      <option value="DELETED">删除</option>
                    </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>💰 {user.points} 积分</div>
                        <div>⏱️ {Math.floor(user.studyTime / 60)} 分钟</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '从未登录'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        title="编辑用户"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setPointsUser(user);
                          setShowPointsModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 mr-2"
                        title="修改积分"
                      >
                        <CurrencyDollarIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleViewOrders(user)}
                        className="text-purple-600 hover:text-purple-900 mr-2"
                        title="查看订单"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleViewUserProfile(user.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="查看前台资料"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
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
                  <ChevronLeftIcon className="h-4 w-4" />
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
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 编辑用户模态框 */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">编辑用户信息</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEditUser({
                email: formData.get('email') as string,
                status: formData.get('status') as string,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    邮箱
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingUser.email || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    状态
                  </label>
                  <select
                    name="status"
                    defaultValue={editingUser.status}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">正常</option>
                    <option value="INACTIVE">禁用</option>
                    <option value="DELETED">删除</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
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

      {/* 新增用户模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">新增用户</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateUser({
                nickname: formData.get('nickname') as string,
                phone: formData.get('phone') as string,
                password: formData.get('password') as string,
                email: formData.get('email') as string || undefined,
                points: Number(formData.get('points')) || 0,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    昵称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nickname"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    手机号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    邮箱
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    初始积分
                  </label>
                  <input
                    type="number"
                    name="points"
                    defaultValue="0"
                    min="0"
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

      {/* 积分修改模态框 */}
      {showPointsModal && pointsUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">修改用户积分</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                用户：{pointsUser.nickname} (当前积分：{pointsUser.points})
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  积分变动 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={pointsChange}
                  onChange={(e) => setPointsChange(Number(e.target.value))}
                  placeholder="正数为增加，负数为减少"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  变动原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  placeholder="请输入积分变动的原因"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPointsModal(false);
                  setPointsUser(null);
                  setPointsChange(0);
                  setPointsReason('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handlePointsChange}
                disabled={pointsChange === 0 || !pointsReason.trim()}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户订单查看模态框 */}
      {showOrdersModal && ordersUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">用户订单记录</h3>
              <button
                onClick={() => {
                  setShowOrdersModal(false);
                  setOrdersUser(null);
                  setUserOrders([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                用户：{ordersUser.nickname} (共 {userOrders.length} 条订单)
              </p>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {ordersLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">加载中...</div>
                </div>
              ) : userOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">暂无订单记录</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrders.map((order: any) => (
                    <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-sm">{order.orderNo}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status === 'PAID' ? '已支付' :
                               order.status === 'PENDING' ? '待支付' : '已取消'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.type === 'RECHARGE' ? 'bg-blue-100 text-blue-800' :
                              order.type === 'COURSE' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.type === 'RECHARGE' ? '充值' :
                               order.type === 'COURSE' ? '短剧' : order.type}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">{order.title}</div>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-green-600">¥{order.amount}</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(order.createdAt).toLocaleString()}</span>
                            {order.paymentTime && (
                              <>
                                <span className="mx-2">•</span>
                                <span>支付时间：{new Date(order.paymentTime).toLocaleString()}</span>
                              </>
                            )}
                          </div>
                          {order.remark && (
                            <div className="text-xs text-gray-400 mt-1">
                              备注：{order.remark}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 