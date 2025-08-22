'use client';

import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, Form, Select, Row, Col, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { request } from '@/utils/request';
import AdminLayout from '../components/layout/AdminLayout';
import { useRouter } from 'next/navigation';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';

interface CourseComment {
  id: number;
  content: string;
  createdAt: Date;
  chapterId?: number;
  user: {
    id: number;
    nickname: string;
    avatar: string;
  };
  course: {
    id: number;
    title: string;
  };
  parent?: {
    id: number;
    content: string;
    user: {
      nickname: string;
    };
  };
  replies: CourseComment[];
  _count: {
    likes: number;
    replies: number;
  };
}

interface CommentResponse {
  items: CourseComment[];
  total: number;
  page: number;
  pageSize: number;
}

export default function CourseCommentsPage() {
  const [comments, setComments] = useState<CourseComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const router = useRouter();

  // 获取评论列表
  const fetchComments = async (params = {}) => {
    setLoading(true);
    try {
      const response = await request('/course-comments', {
        method: 'POST',
        body: JSON.stringify({
          page: currentPage,
          pageSize,
          ...params
        })
      });

      if (response.code === 0) {
        setComments(response.data.items);
        setTotal(response.data.total);
      } else {
        message.error(response.message || '获取评论列表失败');
      }
    } catch (error) {
      console.error('获取评论列表失败:', error);
      message.error('获取评论列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [currentPage, pageSize]);

  // 搜索
  const handleSearch = (values: any) => {
    setCurrentPage(1);
    fetchComments(values);
  };

  // 重置搜索
  const handleReset = () => {
    form.resetFields();
    setCurrentPage(1);
    fetchComments();
  };

  // 删除评论
  const handleDelete = async (id: number) => {
    try {
      const result = await Swal.fire({
        title: '确认删除',
        text: '删除后无法恢复，确定要删除这条评论吗？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        confirmButtonColor: '#d33',
      });

      if (result.isConfirmed) {
        const response = await request(`/course-comments?id=${id}`, {
          method: 'DELETE'
        });

        if (response.code === 0) {
          message.success('删除成功');
          fetchComments();
        } else {
          message.error(response.message || '删除失败');
        }
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      message.error('删除评论失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的评论');
      return;
    }

    try {
      const result = await Swal.fire({
        title: '确认批量删除',
        text: `确定要删除选中的 ${selectedRowKeys.length} 条评论吗？`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        confirmButtonColor: '#d33',
      });

      if (result.isConfirmed) {
        const response = await request(`/course-comments?ids=${JSON.stringify(selectedRowKeys)}`, {
          method: 'DELETE'
        });

        if (response.code === 0) {
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchComments();
        } else {
          message.error(response.message || '批量删除失败');
        }
      }
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error('批量删除失败');
    }
  };

  // 查看短剧详情
  const handleViewCourse = (shortsId: number) => {
    const frontUrl = process.env.NEXT_PUBLIC_FRONT_BASE_URL;
    if (frontUrl) {
      window.open(`${frontUrl}/shorts/${shortsId}`, '_blank');
    }
  };

  const columns: ColumnsType<CourseComment> = [
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
      width: '25%',
      ellipsis: true,
      render: (content: string) => (
        <div style={{ maxWidth: 300, wordBreak: 'break-all' }}>
          {content}
        </div>
      ),
    },
    {
      title: '评论者',
      dataIndex: ['user', 'nickname'],
      key: 'nickname',
      width: '10%',
    },
    {
      title: '所属短剧',
      key: 'courseTitle',
      width: '15%',
      ellipsis: true,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => handleViewCourse(record.course.id)}
        >
          {record.course.title}
        </Button>
      ),
    },
    {
      title: '章节',
      dataIndex: 'chapterId',
      key: 'chapterId',
      width: '8%',
      render: (chapterId: number) => 
        chapterId ? `第${chapterId}章` : '短剧评论',
    },
    {
      title: '回复',
      dataIndex: ['parent'],
      key: 'parentComment',
      width: '20%',
      ellipsis: true,
      render: (parent: CourseComment['parent']) => 
        parent ? `回复 ${parent.user.nickname}: ${parent.content}` : '顶级评论',
    },
    {
      title: '点赞/回复',
      key: 'stats',
      width: '10%',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <span>👍 {record._count.likes}</span>
          <span>💬 {record._count.replies}</span>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '12%',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: '10%',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewCourse(record.course.id)}
          >
            查看短剧
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <AdminLayout>
      <Card title="短剧评论管理" extra={
        <Space>
          <Button 
            danger 
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchDelete}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>
        </Space>
      }>
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
              <Form.Item name="courseId" label="短剧ID">
                <Input placeholder="请输入短剧ID" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="chapterId" label="章节类型">
                <Select
                  placeholder="请选择章节类型"
                  allowClear
                  options={[
                    { label: '短剧评论', value: null },
                    { label: '章节评论', value: 'hasChapter' }
                  ]}
                />
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

        {/* 评论列表 */}
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={comments}
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
          scroll={{ x: 1200 }}
        />
      </Card>
    </AdminLayout>
  );
} 