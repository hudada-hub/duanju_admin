'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, message, Descriptions, Tag, Space } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';
import AdminLayout from '@/app/components/layout/AdminLayout';
import dayjs from 'dayjs';

interface Article {
  id: number;
  title: string;
  content: string;
  summary: string;
  viewCount: number;
  status: 'DRAFT' | 'PUBLISHED';
  tags: string[];
  category: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default  function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  
  // 获取文章详情
  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await request<Article>(`/articles/${params.id}`, {
        method: 'GET',
      });
      if (response.code === 0 && response.data) {
        setArticle(response.data);
      }
    } catch (error) {
      message.error('获取文章失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchArticle();
    }
  }, [params.id]);

  if (!article) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <Card
          title="文章详情"
          className="shadow-md"
          loading={loading}
          extra={
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`/articles/${params.id}/edit`)}
              >
                编辑
              </Button>
              <Button onClick={() => router.back()}>
                返回
              </Button>
            </Space>
          }
        >
          <Descriptions column={2}>
            <Descriptions.Item label="文章标题" span={2}>
              {article.title}
            </Descriptions.Item>
            <Descriptions.Item label="所属分类">
              {article.category.name}
            </Descriptions.Item>
            <Descriptions.Item label="浏览次数">
              {article.viewCount}
            </Descriptions.Item>
            <Descriptions.Item label="发布状态">
              <Tag color={article.status === 'PUBLISHED' ? 'success' : 'default'}>
                {article.status === 'PUBLISHED' ? '已发布' : '未发布'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(article.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="标签" span={2}>
              {article.tags?.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="文章摘要" span={2}>
              {article.summary}
            </Descriptions.Item>
          </Descriptions>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">文章内容</h3>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
} 