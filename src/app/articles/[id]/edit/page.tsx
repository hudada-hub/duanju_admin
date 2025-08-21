'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Form, Input, Button, message, TreeSelect, Select, Switch, Space } from 'antd';
import { request } from '@/utils/request';
import AdminLayout from '@/app/components/layout/AdminLayout';
import dynamic from 'next/dynamic';

const WangEditor = dynamic(() => import('@/components/WangEditor'), {
  ssr: false,
  loading: () => <div>加载中...</div>
});

interface ArticleForm {
  title: string;
  categoryId: number;
  content: string;
  summary: string;
  status: 'DRAFT' | 'PUBLISHED';
  tags: string[];
}

interface ArticleCategory {
  id: number;
  name: string;
  children?: ArticleCategory[];
}

export default function ArticleEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [content, setContent] = useState('');

  // 获取文章分类
  const fetchCategories = async () => {
    try {
      const response = await request<ArticleCategory[]>('/article-categories/tree', {
        method: 'GET',
      });
      if (response.code === 0) {
        setCategories(response.data || []);
      }
    } catch (error) {
      message.error('获取分类失败');
    }
  };

  // 获取文章详情
  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await request(`/articles/${params.id}`, {
        method: 'GET',
      });
      if (response.code === 0 && response.data) {
        const { title, categoryId, content, summary, status, tags } = response.data;
        form.setFieldsValue({
          title,
          categoryId,
          summary,
          status,
          tags: tags || [],
        });
        setContent(content);
      }
    } catch (error) {
      message.error('获取文章失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    if (params.id) {
      fetchArticle();
    }
  }, [params.id]);

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
    if (!content.trim()) {
      message.error('请输入文章内容');
      return;
    }

    try {
      setLoading(true);
      const response = await request(`/articles/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...values,
          content,
        }),
      });
      if (response.code === 0) {
        message.success('保存成功');
        router.push('/articles');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <Card title="编辑文章" className="shadow-md">
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
              rules={[{ required: true, message: '请选择所属分类' }]}
            >
              <TreeSelect
                treeData={transformToTreeData(categories)}
                placeholder="请选择所属分类"
                treeDefaultExpandAll
                className="w-full"
                showSearch
                allowClear
                treeNodeFilterProp="title"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="summary"
              label="文章摘要"
              rules={[{ required: true, message: '请输入文章摘要' }]}
            >
              <Input.TextArea
                placeholder="请输入文章摘要"
                rows={4}
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item
              label="文章内容"
              required
              help="文章内容不能为空"
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
                disabled={loading}
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
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="status"
              label="发布状态"
              valuePropName="checked"
              getValueFromEvent={(checked: boolean) => checked ? 'PUBLISHED' : 'DRAFT'}
              getValueProps={(value: string) => ({ checked: value === 'PUBLISHED' })}
            >
              <Switch
                disabled={loading}
                checkedChildren="已发布"
                unCheckedChildren="草稿"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存
                </Button>
                <Button onClick={() => router.back()}>
                  返回
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </AdminLayout>
  );
} 