'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Card, Button, Space, message, Tag, Select, Input, Row, Col, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { request } from '@/utils/request';
import AdminLayout from '../components/layout/AdminLayout';
import { CosImage } from '../components/common/CosImage';

interface Order {
  id: string;
  orderNo: string;
  type: string;
  title: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paymentTime?: string;
  paymentNo?: string;
  refundTime?: string;
  refundNo?: string;
  courseId?: number;
  taskId?: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  expiredAt: string;
  user?: {
    id: number;
    nickname: string;
    phone: string;
    avatar: string;
  };
  rechargeRecord?: {
    id: number;
    amount: number;
    points: number;
    status: string;
  };
}

interface User {
  id: number;
  nickname: string;
  phone: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // 筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  
  // 防抖搜索
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // 获取订单列表
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString()
      });

      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (typeFilter) {
        params.append('type', typeFilter);
      }

      if (paymentMethodFilter) {
        params.append('paymentMethod', paymentMethodFilter);
      }

      if (userFilter) {
        params.append('userId', userFilter);
      }

      const response = await request(`/orders?${params.toString()}`, {
        method: 'GET'
      });

      if (response.code === 0) {
        setOrders(response.data.items);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      } else {
        message.error(response.message || '获取订单列表失败');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchTerm, statusFilter, typeFilter, paymentMethodFilter, userFilter]);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      const response = await request('/users?page=1&pageSize=1000', {
        method: 'GET'
      });

      if (response.code === 0) {
        setUsers(response.data.items);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  }, []);

  // 防抖处理搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setPaymentMethodFilter('');
    setUserFilter('');
    setCurrentPage(1);
  }, []);

  // 查看订单详情
  const handleViewOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setViewModalVisible(true);
  }, []);

  // 获取订单状态标签
  const getOrderStatusTag = useCallback((status: string) => {
    const statusMap = {
      PENDING: { color: 'orange', text: '待支付' },
      PAID: { color: 'green', text: '已支付' },
      CANCELLED: { color: 'red', text: '已取消' },
      REFUNDED: { color: 'gray', text: '已退款' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  }, []);

  // 获取订单类型标签
  const getOrderTypeTag = useCallback((type: string) => {
    const typeMap = {
      COURSE: { color: 'blue', text: '短剧订单' },
      RECHARGE: { color: 'green', text: '充值订单' },
      TASK: { color: 'orange', text: '任务订单' },
      REGISTER: { color: 'cyan', text: '注册订单' }
    };
    
    const typeInfo = typeMap[type as keyof typeof typeMap] || { color: 'default', text: type };
    return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
  }, []);

  // 获取支付方式标签
  const getPaymentMethodTag = useCallback((method: string) => {
    const methodMap = {
      ALIPAY: { color: 'blue', text: '支付宝' },
      BALANCE: { color: 'green', text: '余额支付' },
    };
    
    const methodInfo = methodMap[method as keyof typeof methodMap] || { color: 'default', text: method };
    return <Tag color={methodInfo.color}>{methodInfo.text}</Tag>;
  }, []);

  const columns: ColumnsType<Order> = useMemo(() => [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140,
      fixed: 'left',
      render: (orderNo: string) => (
        <span className="font-mono text-xs">{orderNo}</span>
      ),
    },
    {
      title: '用户信息',
      key: 'user',
      width: 140,
      render: (_, record) => (
        record.user ? (
          <div className="flex items-center space-x-2">
            <CosImage path={record.user.avatar} width={24} height={24} className="rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">
                {record.user.nickname}
                {record.type === 'REGISTER' && record.user.id === 0 && (
                  <span className="ml-1 text-xs text-orange-600">(注册中)</span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">{record.user.phone}</div>
            </div>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      ),
    },
    {
      title: '订单标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      ellipsis: true,
      render: (title: string, record) => (
        <span className="text-sm" title={title}>
          {record.type === 'REGISTER' ? (
            <span className="text-cyan-600">{title}</span>
          ) : (
            title
          )}
        </span>
      ),
    },
    {
      title: '类型',
      key: 'type',
      width: 90,
      render: (_, record) => getOrderTypeTag(record.type),
    },
    {
      title: '积分',
      key: 'amount',
      width: 90,
      render: (_, record) => (
        <div className="text-green-600 font-medium text-sm">
          {record.amount} 积分
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_, record) => getOrderStatusTag(record.status),
    },
    {
      title: '支付方式',
      key: 'paymentMethod',
      width: 90,
      render: (_, record) => getPaymentMethodTag(record.paymentMethod),
    },
    {
      title: '支付时间',
      key: 'paymentTime',
      width: 160,
      render: (_, record) => (
        record.paymentTime ? 
        <span className="text-sm">{dayjs(record.paymentTime).format('YYYY-MM-DD HH:mm:ss')}</span> : 
        <span className="text-gray-400 text-sm">未支付</span>
      ),
    },

    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => (
        <span className="text-sm">{dayjs(date).format('YYYY-MM-DD HH:mm:ss')}</span>
      ),
    },

  ], [getOrderStatusTag, getOrderTypeTag, getPaymentMethodTag, handleViewOrder]);

  return (
    <AdminLayout>
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">订单管理</h2>
              <p className="text-sm text-gray-500 mt-1">查看和管理所有订单记录</p>
            </div>
          </div>
        }
        size="small"
      >
        {/* 筛选工具栏 */}
        <Card className="mb-4" size="small" style={{ background: '#fafafa' }}>
          <div className="space-y-4">
            {/* 第一行：搜索、状态、类型 */}
            <Row gutter={[16, 16]} align="middle">
              <Col span={8}>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 w-16">搜索：</span>
                  <Input
                    placeholder="请输入订单号、标题、用户昵称或手机号进行搜索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    allowClear
                    prefix={<SearchOutlined />}
                    size="small"
                    style={{ width: '180px' }}
                  />
                </div>
              </Col>
              <Col span={8}>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 w-16">状态：</span>
                  <Select
                    placeholder="请选择订单状态"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    allowClear
                    size="small"
                    style={{ width: '180px' }}
                  >
                    <Select.Option value="PENDING">待支付</Select.Option>
                    <Select.Option value="PAID">已支付</Select.Option>
                    <Select.Option value="CANCELLED">已取消</Select.Option>
                    <Select.Option value="REFUNDED">已退款</Select.Option>
                  </Select>
                </div>
              </Col>
              <Col span={8}>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 w-16">类型：</span>
                  <Select
                    placeholder="请选择订单类型"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    allowClear
                    size="small"
                    style={{ width: '180px' }}
                  >
                    <Select.Option value="COURSE">短剧订单</Select.Option>
                    <Select.Option value="RECHARGE">充值订单</Select.Option>
                    <Select.Option value="TASK">任务订单</Select.Option>
                    <Select.Option value="REGISTER">注册订单</Select.Option>
                  </Select>
                </div>
              </Col>
            </Row>
            
            {/* 第二行：用户筛选和操作按钮 */}
            <Row gutter={[16, 16]} align="middle">
              <Col span={8}>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 w-16">用户：</span>
                  <Select
                    placeholder="请选择用户或输入搜索"
                    value={userFilter}
                    onChange={setUserFilter}
                    allowClear
                    size="small"
                    style={{ width: '180px' }}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {users.map(user => (
                      <Select.Option key={user.id} value={user.id.toString()}>
                        {user.nickname} ({user.phone})
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </Col>
              <Col span={8}>
                <div className="flex items-center space-x-3">
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={handleReset}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    重置筛选
                  </Button>
                  <Button 
                    size="small"
                    onClick={fetchOrders}
                    icon={<ReloadOutlined />}
                    className="hover:bg-gray-100"
                  >
                    刷新数据
                  </Button>
                </div>
              </Col>
            </Row>
            
            {/* 统计信息 */}
            <div className="flex items-center justify-between text-sm border-t pt-4">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  共找到 <span className="font-medium text-blue-600">{total}</span> 条订单
                </span>
                {debouncedSearchTerm && (
                  <span className="text-gray-500">
                    搜索："{debouncedSearchTerm}"
                  </span>
                )}
                {(statusFilter || typeFilter || paymentMethodFilter || userFilter) && (
                  <span className="text-gray-500">
                    已应用筛选条件
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 统计信息卡片 */}
        <Row gutter={16} className="mb-4">
          <Col span={4}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-blue-600">{total}</div>
              <div className="text-sm text-gray-600">总订单数</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter(order => order.status === 'PAID').length}
              </div>
              <div className="text-sm text-gray-600">已支付</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {orders.filter(order => order.status === 'PENDING').length}
              </div>
              <div className="text-sm text-gray-600">待支付</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {orders.filter(order => order.status === 'CANCELLED').length}
              </div>
              <div className="text-sm text-gray-600">已取消</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <div className="text-2xl font-bold text-cyan-600">
                {orders.filter(order => order.type === 'REGISTER').length}
              </div>
              <div className="text-sm text-gray-600">注册订单</div>
            </Card>
          </Col>
        </Row>

        {/* 订单列表 */}
        <Card size="small">
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 1200 }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Card>

        {/* 订单详情弹窗 */}
        <Modal
          title="订单详情"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">订单号</label>
                  <div className="mt-1 font-mono">{selectedOrder.orderNo}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">订单标题</label>
                  <div className="mt-1">{selectedOrder.title}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">订单类型</label>
                  <div className="mt-1">{getOrderTypeTag(selectedOrder.type)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">订单积分</label>
                  <div className="mt-1 text-green-600 font-medium">{selectedOrder.amount} 积分</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">订单状态</label>
                  <div className="mt-1">{getOrderStatusTag(selectedOrder.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">支付方式</label>
                  <div className="mt-1">{getPaymentMethodTag(selectedOrder.paymentMethod)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">支付时间</label>
                  <div className="mt-1">
                    {selectedOrder.paymentTime ? 
                      dayjs(selectedOrder.paymentTime).format('YYYY-MM-DD HH:mm:ss') : 
                      <span className="text-gray-400">未支付</span>
                    }
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">交易号</label>
                  <div className="mt-1 font-mono text-sm">
                    {selectedOrder.paymentNo || <span className="text-gray-400">-</span>}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">创建时间</label>
                  <div className="mt-1">{dayjs(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">过期时间</label>
                  <div className="mt-1">{dayjs(selectedOrder.expiredAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                </div>
              </div>

              {selectedOrder.user && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">用户信息</h4>
                  <div className="flex items-center space-x-3">
                    <CosImage path={selectedOrder.user.avatar} width={48} height={48} className="rounded-full" />
                    <div>
                      <div className="font-medium">{selectedOrder.user.nickname}</div>
                      <div className="text-sm text-gray-500">{selectedOrder.user.phone}</div>
                      {selectedOrder.type === 'REGISTER' && selectedOrder.user.id === 0 && (
                        <div className="text-xs text-orange-600 mt-1">注册中用户</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              

              {selectedOrder.remark && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">备注</h4>
                  <div className="text-gray-700">{selectedOrder.remark}</div>
                </div>
              )}

              {selectedOrder.type === 'REGISTER' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">注册信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">注册手机号</label>
                      <div className="mt-1 font-mono">{selectedOrder.user?.phone}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">注册昵称</label>
                      <div className="mt-1">{selectedOrder.user?.nickname}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </Card>
    </AdminLayout>
  );
} 