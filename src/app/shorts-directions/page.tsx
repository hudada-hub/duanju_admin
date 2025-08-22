'use client';

import { useEffect, useState } from 'react';
import { Button, Table, Drawer, Form, Input, Space, Card } from 'antd';
import { request } from '@/utils/request';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';
import AdminLayout from '../components/layout/AdminLayout';

interface CourseDirection {
  id: number;
  name: string;
  createdAt: string;
}

export default function CourseDirectionsPage() {
  const [directions, setDirections] = useState<CourseDirection[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingDirection, setEditingDirection] = useState<CourseDirection | null>(null);
  const [form] = Form.useForm();

  // 获取方向列表
  const fetchDirections = async () => {
    setLoading(true);
    try {
      const res = await request('/course-directions');
      setDirections(res.data);
    } catch (error) {
      console.error('获取短剧方向失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirections();
  }, []);

  // 打开抽屉进行编辑
  const handleEdit = (record: CourseDirection) => {
    setEditingDirection(record);
    form.setFieldsValue(record);
    setDrawerVisible(true);
  };

  // 打开抽屉进行新增
  const handleAdd = () => {
    setEditingDirection(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  // 删除方向
  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: '确认删除',
      text: '确定要删除这个方向吗？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      try {
        await request(`/course-directions/${id}`, {
          method: 'DELETE'
        });
        await fetchDirections();
        Swal.fire('成功', '方向已删除', 'success');
      } catch (error: any) {
        Swal.fire('错误', error.message || '删除失败', 'error');
      }
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingDirection) {
        // 编辑
        await request(`/course-directions/${editingDirection.id}`, {
          method: 'PUT',
          body: JSON.stringify(values)
        });
      } else {
        // 新增
        await request('/course-directions', {
          method: 'POST',
          body: JSON.stringify(values)
        });
      }
      setDrawerVisible(false);
      await fetchDirections();
      Swal.fire('成功', `${editingDirection ? '更新' : '创建'}成功`, 'success');
    } catch (error: any) {
      Swal.fire('错误', error.message || `${editingDirection ? '更新' : '创建'}失败`, 'error');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '方向名称',
      dataIndex: 'name',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: CourseDirection) => (
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
              新增方向
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={directions}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />

          <Drawer
            title={editingDirection ? '编辑方向' : '新增方向'}
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
                label="方向名称"
                rules={[{ required: true, message: '请输入方向名称' }]}
              >
                <Input placeholder="请输入方向名称" />
              </Form.Item>
            </Form>
          </Drawer>
        </Card>
      </div>
    </AdminLayout>
  );
} 