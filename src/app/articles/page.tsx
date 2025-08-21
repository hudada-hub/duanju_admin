'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, message, Modal, Form, Input, Select, Row, Col, Card, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { request } from '@/utils/request';
import AdminLayout from '../components/layout/AdminLayout';
import Swal from 'sweetalert2';  // 导入 Sweetalert2

interface Article {
  id: number;
  title: string;
  content: string;
  authorId: number;
  createdAt: Date;
  status: 'DRAFT' | 'PUBLISHED';
  updatedAt?: Date;
  viewCount: number;
  summary?: string;
  tags?: string[];
  category: {
    id: number;
    name: string;
  };
}

interface ArticleCategory {
  id: number;
  name: string;
}

interface SearchParams {
  title?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  categoryId?: number;
}

export default function ArticlesPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({});

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await request<ArticleCategory[]>('/article-categories', {
        method: 'GET',
      });
      if (response.code === 0) {
        setCategories(response.data || []);
      }
    } catch (error) {
      message.error('获取分类列表失败');
    }
  };

  // 获取文章列表
  const fetchArticles = async (params: SearchParams = {}) => {
    try {
      setLoading(true);
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params.title) queryParams.append('title', params.title);
      if (params.status) queryParams.append('status', params.status);
      if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
      
      const response = await request<Article[]>(`/articles?${queryParams.toString()}`, {
        method: 'GET',
      });
      if (response.code === 0) {
        setArticles(response.data || []);
      }
    } catch (error) {
      message.error('获取文章列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, []);

  // 处理搜索
  const handleSearch = async (values: SearchParams) => {
    setSearchParams(values);
    await fetchArticles(values);
  };

  // 重置搜索
  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    fetchArticles();
  };

  // 删除文章
  const handleDelete = async (id: number) => {
    // 使用 Sweetalert2 显示确认弹窗
    const result = await Swal.fire({
      title: '确认删除',
      text: '确定要删除这篇文章吗？此操作不可恢复。',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      // 添加漂亮的动画
      showClass: {
        popup: 'swal2-show',
        backdrop: 'swal2-backdrop-show',
        icon: 'swal2-icon-show'
      },
      hideClass: {
        popup: 'swal2-hide',
        backdrop: 'swal2-backdrop-hide',
        icon: 'swal2-icon-hide'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await request(`/articles/${id}`, {
          method: 'DELETE',
        });
        
        if (response.code === 0) {
          // 显示删除成功的提示
          await Swal.fire({
            title: '删除成功！',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true
          });
          
          fetchArticles();
        }
      } catch (error) {
        // 显示错误提示
        await Swal.fire({
          title: '删除失败',
          text: '操作过程中发生错误，请稍后重试',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: '确定'
        });
      }
    }
  };

  const columns: ColumnsType<Article> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      ellipsis: true,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: '20%',
      ellipsis: true,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      width: '25%',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '8%',
      render: (status: string, record: any) => (
        <Switch
          checked={status === 'PUBLISHED'}
          checkedChildren="已发布"
          unCheckedChildren="草稿"
          onChange={async (checked) => {
            try {
              const response = await request(`/articles/${record.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  status: checked ? 'PUBLISHED' : 'DRAFT'
                }),
              });
              if (response.code === 0) {
                message.success('状态更新成功');
                // 刷新列表
                fetchArticles(searchParams);
              }
            } catch (error) {
              message.error('状态更新失败');
            }
          }}
        />
      ),
    },
    {
      title: '阅读量',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: '8%',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: '15%',
      ellipsis: true,
      render: (tags: string[] | undefined) => (
        <>
          {tags?.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </>
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
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            onClick={() => {
              const frontUrl = process.env.NEXT_PUBLIC_FRONT_BASE_URL;
              if (frontUrl) {
                window.open(`${frontUrl}/protocol/${record.id}`, '_blank');
              }
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => router.push(`/articles/${record.id}/edit`)}
          >
            编辑
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

  return (
    <AdminLayout>
      <div className="p-6">
        <Card className="mb-4">
          <Form
            form={form}
            onFinish={handleSearch}
            layout="horizontal"
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="title" label="文章标题">
                  <Input
                    placeholder="请输入文章标题"
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="status" label="发布状态">
                  <Select
                    placeholder="请选择状态"
                    allowClear
                  >
                    <Select.Option value="DRAFT">草稿</Select.Option>
                    <Select.Option value="PUBLISHED">已发布</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="categoryId" label="文章分类">
                  <Select
                    placeholder="请选择分类"
                    allowClear
                  >
                    {categories.map(category => (
                      <Select.Option key={category.id} value={category.id}>
                        {category.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                      搜索
                    </Button>
                    <Button onClick={handleReset}>重置</Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

       <Card>
       <div className="mb-4 flex justify-end items-center">
      
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => router.push('/articles/create')}
      >
        新建文章
      </Button>
    </div>
    <Table
          columns={columns}
          dataSource={articles}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1300 }}
          className="w-full"
        />
       </Card>
     
      </div>
    </AdminLayout>
  );
} 