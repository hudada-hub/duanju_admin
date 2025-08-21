import { useState, useEffect } from 'react';
import { request } from '@/utils/request';

// 课程数据类型定义
interface Course {
  id: number;
  title: string;
  coverUrl: string;
  summary: string;
  description: string;
  instructor: string;
  viewCount: number;
  studentCount: number;
  level: string;
  totalDuration: number;
  ratingScore: number;
  categoryId: number;
  directionId: number;
  oneTimePayment: boolean; // 添加一次性支付字段
  category?: { id: number; name: string };
  direction?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

// API响应数据类型
interface ApiResponse {
  data: Course[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// 分页参数类型
interface PaginationParams {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  directionId?: number;
  level?: string;
  keyword?: string;
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
  });

  const fetchCourses = async (params: PaginationParams = {}) => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
      if (params.directionId) queryParams.append('directionId', params.directionId.toString());
      if (params.level) queryParams.append('level', params.level);
      if (params.keyword) queryParams.append('keyword', params.keyword);

      const response = await request(`/user/courses?${queryParams.toString()}`, {
        method: 'GET',
      });

      // 更新数据处理逻辑以匹配新的API响应格式
      const apiData = response.data as ApiResponse;
      
      setCourses(apiData.data);
      setPagination({
        page: apiData.pagination.page,
        pageSize: apiData.pagination.pageSize,
        total: apiData.pagination.total,
      });
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // 切换页码
  const changePage = (page: number) => {
    fetchCourses({ page, pageSize: pagination.pageSize });
  };

  // 切换每页数量
  const changePageSize = (pageSize: number) => {
    fetchCourses({ page: 1, pageSize });
  };

  // 按分类筛选
  const filterByCategory = (categoryId: number) => {
    fetchCourses({ page: 1, pageSize: pagination.pageSize, categoryId });
  };

  // 按方向筛选
  const filterByDirection = (directionId: number) => {
    fetchCourses({ page: 1, pageSize: pagination.pageSize, directionId });
  };

  // 按难度筛选
  const filterByLevel = (level: string) => {
    fetchCourses({ page: 1, pageSize: pagination.pageSize, level });
  };

  // 搜索
  const search = (keyword: string) => {
    fetchCourses({ page: 1, pageSize: pagination.pageSize, keyword });
  };

  // 重置筛选
  const resetFilters = () => {
    fetchCourses({ page: 1, pageSize: pagination.pageSize });
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return {
    courses,
    loading,
    error,
    pagination,
    refreshCourses: () => fetchCourses(),
    changePage,
    changePageSize,
    filterByCategory,
    filterByDirection,
    filterByLevel,
    search,
    resetFilters,
  };
} 