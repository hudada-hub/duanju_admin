'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button, TreeSelect, Select, message } from 'antd';
import { useRouter } from 'next/navigation';
import { request } from '@/utils/request';
import AdminLayout from '../../components/layout/AdminLayout';
import dynamic from 'next/dynamic';

// 动态导入 WangEditor 组件
const WangEditor = dynamic(() => import('@/components/WangEditor'), {
  ssr: false // 禁用服务器端渲染
});

interface ArticleCategory {
  id: number;
  name: string;
  children?: ArticleCategory[];
}

interface ArticleForm {
  title: string;
  content: string;
  summary?: string;
  categoryId: number;
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED';
}

export default function CreateArticlePage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [content, setContent] = useState('');

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await request<ArticleCategory[]>('/article-categories/tree', {
        method: 'GET',
      });
      if (response.code === 0) {
        setCategories(response.data || []);
      }
    } catch (error) {
      message.error('获取分类列表失败');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 将分类列表转换为TreeSelect选项
  const transformToTreeData = (categories: ArticleCategory[]): any[] => {
    return categories.map(category => ({
      title: category.name,
      value: category.id,
      children: category.children ? transformToTreeData(category.children) : undefined,
    }));
  };

  // 处理表单提交
  const handleSubmit = async (values: ArticleForm) => {
    try {
      if (!content) {
        message.error('请输入文章内容');
        return;
      }

      setLoading(true);
      const submitData = {
        ...values,
        content,
      };
      
      const response = await request('/articles', {
        method: 'POST',
        body: JSON.stringify(submitData),
      });

      if (response.code === 0) {
        message.success('创建成功');
        router.push('/articles');
      }
    } catch (error) {
      console.log(error,'111');
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">新建文章</h1>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
        >
          <Form.Item
            name="title"
            label="文章标题"
            rules={[{ required: true, message: '请输入文章标题' }]}
          >
            <Input placeholder="请输入文章标题" />
          </Form.Item>

          <Form.Item
            name="categoryId"
            label="所属分类"
            rules={[{ required: true, message: '请选择文章分类' }]}
          >
            <TreeSelect
              treeData={transformToTreeData(categories)}
              placeholder="请选择文章分类"
              treeDefaultExpandAll
              className="w-full"
              showSearch
              allowClear
              treeNodeFilterProp="title"
            />
          </Form.Item>

          <Form.Item
            name="summary"
            label="文章摘要"
          >
            <Input.TextArea
              placeholder="请输入文章摘要"
              rows={4}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="文章标签"
          >
            <Select
              mode="tags"
              placeholder="请输入标签"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="文章内容"
            required
            className="mb-0"
          >
            <WangEditor
              value={content}
              onChange={setContent}
              placeholder="请输入文章内容..."
              height={500}
              maxImageSize={50 * 1024 * 1024}
              maxVideoSize={50 * 1024 * 1024}
              maxImageNumber={10}
              maxVideoNumber={5}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="发布状态"
            initialValue="DRAFT"
          >
            <Select>
              <Select.Option value="DRAFT">草稿</Select.Option>
              <Select.Option value="PUBLISHED">发布</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <div className="flex justify-end space-x-4">
              <Button onClick={() => router.back()}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </AdminLayout>
  );
} 