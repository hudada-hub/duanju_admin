import { useState, useEffect } from 'react';
import { request } from '@/utils/request';

export interface Short {
  id: number;
  title: string;
  description: string;
  summary?: string;
  coverUrl: string;
  instructor: string;
  categoryId: number;
  directionId: number;
 

  createdAt: string;
  updatedAt: string;
  category?: {
    id: number;
    name: string;
  };
  direction?: {
    id: number;
    name: string;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  directionId?: number;
  keyword?: string;
}

export interface Pagination {
  current: number;
  pageSize: number;
  total: number;
}

export function useShorts() {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    current: 1,
    pageSize: 12,
    total: 0,
  });

  const fetchShorts = async (params: PaginationParams = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
      if (params.directionId) queryParams.append('directionId', params.directionId.toString());
      if (params.keyword) queryParams.append('keyword', params.keyword);

      const response = await request(`/user/shorts?${queryParams.toString()}`, {
        method: 'GET',
      });

      const apiData = response.data;
      setShorts(apiData.data);
      setPagination(prev => ({
        ...prev,
        current: apiData.pagination.page,
        pageSize: apiData.pagination.pageSize,
        total: apiData.pagination.total,
      }));
    } catch (error) {
      console.error('获取短剧列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number, pageSize: number) => {
    fetchShorts({ page, pageSize });
  };

  const handlePageSizeChange = (pageSize: number) => {
    fetchShorts({ page: 1, pageSize });
  };

  const handleCategoryChange = (categoryId: number) => {
    fetchShorts({ page: 1, pageSize: pagination.pageSize, categoryId });
  };

  const handleDirectionChange = (directionId: number) => {
    fetchShorts({ page: 1, pageSize: pagination.pageSize, directionId });
  };

  const handleSearch = (keyword: string) => {
    fetchShorts({ page: 1, pageSize: pagination.pageSize, keyword });
  };

  const refreshShorts = () => {
    fetchShorts({ page: 1, pageSize: pagination.pageSize });
  };

  return {
    shorts,
    loading,
    pagination,
    fetchShorts,
    handlePageChange,
    handlePageSizeChange,
    handleCategoryChange,
    handleDirectionChange,
    handleSearch,
    refreshShorts: () => fetchShorts(),
  };
} 