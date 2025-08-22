'use client';

import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Form, Select, Row, Col, Input, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { request } from '@/utils/request';
import AdminLayout from '../components/layout/AdminLayout';
import { useRouter } from 'next/navigation';
import { EyeOutlined, UserOutlined, ShoppingCartOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { CosImage } from '../components/common/CosImage';

interface CourseOrder {
  id: string;
  userId: number;
  shortsId: number;
  chapterId: number;
  points: number;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    nickname: string;
    avatar: string;
    phone: string;
  };
  shorts: {
    id: number;
    title: string;
    coverUrl: string;
  };
  chapter: {
    id: number;
    title: string;
    duration: number;
  };
}

interface OrderStats {
  totalOrders: number;
  totalPoints: number;
  averageProgress: number;
  todayOrders: number;
}

interface OrderResponse {
  items: CourseOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export default function CourseOrdersPage() {
  const [orders, setOrders] = useState<CourseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalPoints: 0,
    averageProgress: 0,
    todayOrders: 0
  });
  const [form] = Form.useForm();
  const router = useRouter();

  // 获取订单列表
  const fetchOrders = async (params = {}) => {
    setLoading(true);
    try {
      const response = await request('/shorts-orders', {
        method: 'POST',
        body: JSON.stringify({
          page: currentPage,
          pageSize,
          ...params
        })
      });

      if (response.code === 0) {
        setOrders(response.data.items);
        setTotal(response.data.total);
      } else {
        message.error(response.message || '获取订单列表失败');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await request('/shorts-orders?type=stats', {
        method: 'GET'
      });

      if (response.code === 0) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [currentPage, pageSize]);

  // 搜索
  const handleSearch = (values: any) => {
    setCurrentPage(1);
    fetchOrders(values);
  };

  // 重置搜索
  const handleReset = () => {
    form.resetFields();
    setCurrentPage(1);
    fetchOrders();
  };

  // 查看短剧详情
  const handleViewCourse = (shortsId: number) => {
    const frontUrl = process.env.NEXT_PUBLIC_FRONT_BASE_URL;
    if (frontUrl) {
      router.push(`/shorts/${shortsId}`);
    }
  };

  // 查看用户详情
  const handleViewUser = (userId: number) => {
    router.push(`/users/${userId}`);
  };

  const columns: ColumnsType<CourseOrder> = [
    {
      title: '订单ID',
      dataIndex: 'id',
      key: 'id',
      width: '12%',
      ellipsis: true,
    },
    {
      title: '用户信息',
      key: 'user',
      width: '15%',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <div className="flex items-center space-x-2">
            <CosImage path={record.user.avatar} width={32} height={32} className="rounded-full" />
            <div>
              <div className="font-medium">{record.user.nickname}</div>
              <div className="text-xs text-gray-500">{record.user.phone}</div>
            </div>
          </div>
          <Button 
            type="link" 
            size="small" 
            icon={<UserOutlined />}
            onClick={() => handleViewUser(record.user.id)}
          >
            查看用户
          </Button>
        </Space>
      ),
    },
    {
      title: '短剧信息',
      key: 'shorts',
      width: '20%',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <div className="flex items-center space-x-2">
            <CosImage path={record.shorts.coverUrl} width={40} height={30} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{record.shorts.title}</div>
              <div className="text-xs text-gray-500">第{record.chapter.id}章: {record.chapter.title}</div>
            </div>
          </div>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewCourse(record.shorts.id)}
          >
            查看短剧
          </Button>
        </Space>
      ),
    },
    {
      title: '消费积分',
      dataIndex: 'points',
      key: 'points',
      width: '10%',
      render: (points: number) => (
        <Tag color="orange" icon={<ShoppingCartOutlined />}>
          {points} 积分
        </Tag>
      ),
    },
    {
      title: '学习进度',
      dataIndex: 'progress',
      key: 'progress',
      width: '12%',
      render: (progress: number) => (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-sm">{progress.toFixed(1)}%</span>
        </div>
      ),
    },
    {
      title: '章节时长',
      key: 'duration',
      width: '10%',
      render: (_, record) => (
        <div className="flex items-center space-x-1">
          <ClockCircleOutlined className="text-gray-400" />
          <span>{record.chapter.duration || 0}分钟</span>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: '15%',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总订单数"
                value={stats.totalOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总消费积分"
                value={stats.totalPoints}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#cf1322' }}
                suffix="积分"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均学习进度"
                value={stats.averageProgress}
                precision={1}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
                suffix="%"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日订单数"
                value={stats.todayOrders}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 订单列表 */}
        <Card title="短剧订单管理">
          {/* 搜索表单 */}
          <Form
            form={form}
            layout="inline"
            onFinish={handleSearch}
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16} style={{ width: '100%' }}>
              <Col span={6}>
                <Form.Item name="userId" label="用户ID">
                  <Input placeholder="请输入用户ID" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="shortsId" label="短剧ID">
                  <Input placeholder="请输入短剧ID" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="chapterId" label="章节ID">
                  <Input placeholder="请输入章节ID" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      搜索
                    </Button>
                    <Button onClick={handleReset}>
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>

          {/* 订单列表 */}
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
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
            scroll={{ x: 1400 }}
          />
        </Card>
      </div>
    </AdminLayout>
  );
} 