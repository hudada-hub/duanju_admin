'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Space, Switch, Modal, Form, Input, InputNumber, message, TreeSelect, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { request } from '@/utils/request';
import AdminLayout from '../components/layout/AdminLayout';
import Swal from 'sweetalert2';  // 导入 Sweetalert2

interface ArticleCategory {
  id: number;
  name: string;
  description: string;
  sort: number;  // 修改字段名
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  parentId?: number;
  children?: ArticleCategory[];
  parent?: ArticleCategory;
}

interface TreeSelectData {
  title: string;
  value: number;
  children?: TreeSelectData[];
}

export default function ArticleCategoriesPage() {
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ArticleCategory | null>(null);
  const [form] = Form.useForm();

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await request<ArticleCategory[]>('/article-categories/tree', {
        method: 'GET',
      });
      if (response.code === 0) {
        setCategories(response.data || []);
      }
    } catch (error) {
      message.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 将分类列表转换为TreeSelect需要的格式
  const transformToTreeData = (categories: ArticleCategory[]): TreeSelectData[] => {
    return categories.map(category => ({
      title: category.name,
      value: category.id,
      children: category.children ? transformToTreeData(category.children) : undefined,
    }));
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      const url = editingCategory 
        ? `/article-categories/${editingCategory.id}`
        : '/article-categories';
      const method = editingCategory ? 'PUT' : 'POST';
      console.log(values,'values')

      const response = await request(url, {
        method,
        body: JSON.stringify({
          ...values,
          sort: values.sort 
        }),
      });

      if (response.code === 0) {
        message.success(editingCategory ? '更新成功' : '创建成功');
        setModalVisible(false);
        form.resetFields();
        fetchCategories();
      }
    } catch (error) {
      message.error(editingCategory ? '更新失败' : '创建失败');
    }
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    // 使用 Sweetalert2 显示确认弹窗
    const result = await Swal.fire({
      title: '确认删除',
      text: '确定要删除这个分类吗？如果有子分类，子分类也会被删除。',
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
        const response = await request(`/article-categories/${id}`, {
          method: 'DELETE',
        });
        
        if (response.code === 0) {
          // 显示删除成功的提示
          await Swal.fire({
            title: '删除成功！',
            text: '分类及其子分类已被删除',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            position: 'top-end',
            toast: true
          });
          
          fetchCategories();
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

  // 处理状态切换
  const handleStatusChange = async (id: number, isEnabled: boolean) => {
    try {
      const response = await request(`/article-categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled }),
      });
      if (response.code === 0) {
        message.success('状态更新成功');
        fetchCategories();
      }
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const columns: ColumnsType<ArticleCategory> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 80,
      render: (isEnabled: boolean, record) => (
        <Switch
          checked={isEnabled}
          onChange={(checked) => handleStatusChange(record.id, checked)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingCategory(record);
              form.setFieldsValue({
                ...record,
                parentId: record.parent?.id,
              });
              setModalVisible(true);
            }}
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
      <Card className="p-6">
        <div className="mb-4 flex justify-between items-center">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCategory(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新建分类
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={false}
          expandable={{
            defaultExpandAllRows: true,
          }}
        />

        <Modal
          title={editingCategory ? '编辑分类' : '新建分类'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          maskClosable={false}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label="分类名称"
              rules={[{ required: true, message: '请输入分类名称' }]}
            >
              <Input placeholder="请输入分类名称" />
            </Form.Item>
            <Form.Item
              name="parentId"
              label="父级分类"
            >
              <TreeSelect
                treeData={transformToTreeData(categories)}
                placeholder="请选择父级分类"
                allowClear
                treeDefaultExpandAll
                disabled={editingCategory?.id === 1}
              />
            </Form.Item>
            <Form.Item
              name="description"
              label="分类描述"
            >
              <Input.TextArea placeholder="请输入分类描述" rows={4} />
            </Form.Item>
            <Form.Item
              name="sort"  // 保持前端表单字段名为sort
              label="排序"
              initialValue={0}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="isEnabled"
              label="状态"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </AdminLayout>
  );
}