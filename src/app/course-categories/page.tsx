'use client';

import { useEffect, useState } from 'react';
import { Button, Table, Drawer, Form, Input, Space, Card } from 'antd';
import { request } from '@/utils/request';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';
import AdminLayout from '../components/layout/AdminLayout';

interface CourseCategory {
  id: number;
  name: string;
  createdAt: string;
}

export default function CourseCategoriesPage() {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [form] = Form.useForm();

  // 获取分类列表
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await request('/course-categories', {
        method: 'GET'
      });
      setCategories(res.data);
    } catch (error) {
      console.error('获取短剧分类失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 打开抽屉进行编辑
  const handleEdit = (record: CourseCategory) => {
    setEditingCategory(record);
    form.setFieldsValue(record);
    setDrawerVisible(true);
  };

  // 打开抽屉进行新增
  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  // 删除分类
  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: '确认删除',
      text: '确定要删除这个分类吗？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      try {
        await request(`/course-categories/${id}`, {
            method: 'DELETE'
        });
        await fetchCategories();
        Swal.fire('成功', '分类已删除', 'success');
      } catch (error: any) {
        Swal.fire('错误', error.message || '删除失败', 'error');
      }
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCategory) {
        // 编辑
        await request(`/course-categories/${editingCategory.id}`, {
            method: 'PUT',
            body: JSON.stringify(values)
        });
      } else {
        // 新增
        await request('/course-categories', {
            method: 'POST',
            body: JSON.stringify(values)
        });
      }
      setDrawerVisible(false);
      await fetchCategories();
      Swal.fire('成功', `${editingCategory ? '更新' : '创建'}成功`, 'success');
    } catch (error: any) {
      Swal.fire('错误', error.message || `${editingCategory ? '更新' : '创建'}失败`, 'error');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: CourseCategory) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
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
      <Card>
        <div className="mb-4">
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增分类
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />

        <Drawer
          title={editingCategory ? '编辑分类' : '新增分类'}
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          extra={
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleSubmit}>
                确定
              </Button>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              name="name"
              label="分类名称"
              rules={[{ required: true, message: '请输入分类名称' }]}
            >
              <Input placeholder="请输入分类名称" />
            </Form.Item>
          </Form>
        </Drawer>
      </Card>
    </div>
    </AdminLayout>
  );
} 