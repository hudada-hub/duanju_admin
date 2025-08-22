'use client';
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Input, Select, Pagination, Space, Tag, Avatar, Progress } from 'antd';
import { RiSearchLine, RiEyeLine, RiPlayCircleLine, RiTimeLine, RiUserLine } from 'react-icons/ri';
import { useShorts } from '../shorts/hooks/useShorts';
import { request } from '@/utils/request';
import { CosImage } from '../components/common/CosImage';
import Swal from 'sweetalert2';

const { Search } = Input;
const { Option } = Select;

interface Category {
  id: number;
  name: string;
}

interface Direction {
  id: number;
  name: string;
}

export default function ShortsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  const {
    shorts,
    loading,
    pagination,
    refreshShorts,
    handlePageChange,
    handlePageSizeChange,
    handleCategoryChange,
    handleDirectionChange,
    handleSearch,
  } = useShorts();

  // 获取分类和方向数据
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [categoriesRes, directionsRes] = await Promise.all([
          request('/shorts-categories'),
          request('/shorts-directions')
        ]);
        setCategories(categoriesRes.data);
        setDirections(directionsRes.data);
      } catch (error) {
        console.error('获取选项数据失败:', error);
      }
    };
    fetchOptions();
  }, []);

  // 处理分类筛选
  const handleCategoryFilter = (categoryId: number) => {
    setSelectedCategory(categoryId);
    handleCategoryChange(categoryId);
  };

  // 处理方向筛选
  const handleDirectionFilter = (directionId: number) => {
    setSelectedDirection(directionId);
    handleDirectionChange(directionId);
  };

  // 处理搜索
  const handleSearchSubmit = (value: string) => {
    setSearchKeyword(value);
    handleSearch(value);
  };

  // 重置筛选
  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedDirection(null);
    setSearchKeyword('');
    refreshShorts();
  };

  // 查看短剧详情
  const handleViewShort = async (id: number) => {
    try {
      // 增加观看次数
      await request(`/shorts/${id}/view`, {
        method: 'POST'
      });
      
      // 跳转到短剧详情页
      window.location.href = `/shorts/${id}`;
    } catch (error) {
      console.error('增加观看次数失败:', error);
      // 即使失败也跳转
      window.location.href = `/shorts/${id}`;
    }
  };

  // 渲染短剧卡片
  const renderShortCard = (short: any) => (
    <Col xs={24} sm={12} md={8} lg={6} key={short.id}>
      <Card
        hoverable
        className="h-full"
        cover={
          <div className="relative">
            <CosImage 
              path={short.coverUrl} 
              width="100%" 
              height={200}
              className="object-cover"
            />
            <div className="absolute top-2 right-2">
              <Tag color="blue">{short.category?.name}</Tag>
            </div>
            <div className="absolute bottom-2 left-2">
              <Tag color="green">{short.direction?.name}</Tag>
            </div>
          </div>
        }
        actions={[
          <Button 
            type="link" 
            icon={<RiEyeLine />}
            onClick={() => handleViewShort(short.id)}
          >
            查看详情
          </Button>
        ]}
      >
        <Card.Meta
          title={
            <div className="truncate" title={short.title}>
              {short.title}
            </div>
          }
          description={
            <div className="space-y-2">
              <div className="text-sm text-gray-600 line-clamp-2">
                {short.summary || short.description}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center">
                  <RiUserLine className="mr-1" />
                  {short.instructor}
                </span>
                <span className="flex items-center">
                  <RiTimeLine className="mr-1" />
                  {short.totalDuration || 0}分钟
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>观看: {short.viewCount || 0}</span>
                <span>收藏: {short.favoriteCount || 0}</span>
              </div>
            </div>
          }
        />
      </Card>
    </Col>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4">短剧学习</h1>
        
        {/* 搜索和筛选区域 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Search
            placeholder="搜索短剧..."
            allowClear
            onSearch={handleSearchSubmit}
            style={{ width: 300 }}
          />
          
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 150 }}
            value={selectedCategory}
            onChange={handleCategoryFilter}
          >
            {categories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
          
          <Select
            placeholder="选择方向"
            allowClear
            style={{ width: 150 }}
            value={selectedDirection}
            onChange={handleDirectionFilter}
          >
            {directions.map(dir => (
              <Option key={dir.id} value={dir.id}>{dir.name}</Option>
            ))}
          </Select>
          
          <Button onClick={resetFilters}>重置筛选</Button>
        </div>

        {/* 短剧列表 */}
        {shorts.length > 0 ? (
          <Row gutter={[16, 16]}>
            {shorts.map(renderShortCard)}
          </Row>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {loading ? '加载中...' : '暂无短剧数据'}
          </div>
        )}

        {/* 分页 */}
        {pagination.total > 0 && (
          <div className="flex justify-center mt-8">
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
              onChange={handlePageChange}
              onShowSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
} 