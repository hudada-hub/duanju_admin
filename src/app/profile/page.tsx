'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Tabs, Avatar, Upload } from 'antd';
import { UserOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@/utils/request';
import AdminLayout from '../components/layout/AdminLayout';

interface UserInfo {
  email: string;
  avatar?: string;
  nickname?: string;
  phone: string;
}

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [basicForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [uploadProps, setUploadProps] = useState<UploadProps>({
    name: 'avatar',
    action: '/api/upload/avatar',
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    maxCount: 1,
    showUploadList: false,
  });

  useEffect(() => {
    // 在客户端设置需要 localStorage 的配置
    setUploadProps(prev => ({
      ...prev,
      headers: {
        authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      beforeUpload: (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
          message.error('只能上传图片文件！');
          return false;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
          message.error('图片大小不能超过 2MB！');
          return false;
        }

        return true;
      },
      onChange(info) {
        if (info.file.status === 'uploading') {
          setLoading(true);
        }
        if (info.file.status === 'done') {
          setLoading(false);
          if (info.file.response.code === 0) {
            message.success('头像上传成功');
            fetchUserInfo();
          } else {
            message.error(info.file.response.message || '头像上传失败');
          }
        } else if (info.file.status === 'error') {
          setLoading(false);
          message.error('头像上传失败');
        }
      },
    }));
  }, []);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const response = await request<UserInfo>('/users/profile', {
        method: 'GET',
      });
      if (response.code === 0 && response.data) {
        setUserInfo(response.data);
        localStorage.setItem('userInfo', JSON.stringify(response.data));
        basicForm.setFieldsValue(response.data);
      }
    } catch (error) {
      message.error('获取用户信息失败');
    }
  };

  // 更新基本信息
  const handleUpdateBasicInfo = async (values: UserInfo) => {
    try {
      setLoading(true);
      const response = await request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      if (response.code === 0) {
        message.success('更新成功');
        fetchUserInfo();
      }
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values: PasswordForm) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    try {
      setLoading(true);
      const response = await request('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      });
      if (response.code === 0) {
        message.success('密码修改成功');
        passwordForm.resetFields();
      }
    } catch (error) {
      message.error('密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: '基本信息',
      children: (
        <Form
          form={basicForm}
          layout="vertical"
          onFinish={handleUpdateBasicInfo}
          className="max-w-lg"
        >
          <div className="mb-6 flex justify-center">
            <div className="text-center">
              <Avatar
                size={100}
                src={userInfo?.avatar}
                icon={<UserOutlined />}
                className="mb-4"
              />
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>更换头像</Button>
              </Upload>
            </div>
          </div>

          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: '2',
      label: '修改密码',
      children: (
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          className="max-w-lg"
        >
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入当前密码"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能小于6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入新密码"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请确认新密码"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <Card title="个人资料" className="shadow-md">
          <Tabs defaultActiveKey="1" items={items} />
        </Card>
      </div>
    </AdminLayout>
  );
}