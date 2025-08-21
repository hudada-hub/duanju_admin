'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button, Space, Popconfirm, Tag, Pagination, Select, Input, Card, Row, Col, Tabs } from 'antd';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import AddCourseModal from './components/AddCourseModal';
import { useCourses } from './hooks/useCourses';
import { request } from '@/utils/request';
import ChapterModal from './components/ChapterModal';
import { CosImage } from './components/CosImage';

const { Search } = Input;
const { Option } = Select;

const levelColors = {
  BEGINNER: 'green',
  ELEMENTARY: 'cyan',
  INTERMEDIATE: 'blue',
  ADVANCED: 'purple',
  EXPERT: 'red',
};

const levelLabels = {
  BEGINNER: '入门',
  ELEMENTARY: '初级',
  INTERMEDIATE: '中级',
  ADVANCED: '高级',
  EXPERT: '专家',
};

export default function CoursesPage() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('my');

  // 筛选状态
  const [filters, setFilters] = useState({
    categoryId: undefined as number | undefined,
    directionId: undefined as number | undefined,
    level: undefined as string | undefined,
    keyword: '',
  });

  // 防抖搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');

  const { 
    courses, 
    loading, 
    error, 
    pagination,
    refreshCourses,
    changePage,
    changePageSize,
    filterByCategory,
    filterByDirection,
    filterByLevel,
    search,
    resetFilters
  } = useCourses();


  // 防抖搜索处理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchKeyword !== filters.keyword) {
        // 滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (searchKeyword.trim()) {
          search(searchKeyword.trim());
        } else {
          resetFilters();
        }
        setFilters(prev => ({ ...prev, keyword: searchKeyword }));
      }
    }, 500); // 500ms 防抖延迟

    return () => clearTimeout(timer);
  }, [searchKeyword, search, resetFilters]);

  const showModal = () => {
    setEditingCourse(null);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingCourse(null);
    refreshCourses();
  };

  const handleEditChapter = (record: any) => {
    setSelectedCourseId(record.id);
    setIsChapterModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingCourse(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/courses/${id}`, {
        method: 'DELETE',
      });
      Swal.fire({
        icon: 'success',
        title: '删除成功',
        text: '课程已成功删除',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        position: 'top-end',
        toast: true
      });
      refreshCourses();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: '删除失败',
        text: '请稍后重试',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        position: 'top-end',
        toast: true
      });
    }
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  // 处理搜索按钮点击
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
  };

  // 处理分页变化，滚动到页面顶部
  const handlePageChange = (page: number, pageSize?: number) => {
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 执行分页操作
    changePage(page);
    if (pageSize && pageSize !== pagination.pageSize) {
      changePageSize(pageSize);
    }
  };

  // 处理筛选变化，滚动到页面顶部
  const handleFilterChange = (type: string, value: any) => {
    const newFilters = { ...filters, [type]: value };
    setFilters(newFilters);
    
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 应用筛选
    if (type === 'categoryId' && value) {
      filterByCategory(value);
    } else if (type === 'directionId' && value) {
      filterByDirection(value);
    } else if (type === 'level' && value) {
      filterByLevel(value);
    }
  };

  // 重置筛选，滚动到页面顶部
  const handleResetFilters = () => {
    setFilters({
      categoryId: undefined,
      directionId: undefined,
      level: undefined,
      keyword: '',
    });
    setSearchKeyword('');
    
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    resetFilters();
  };

  if (error) {
    return <div>加载失败: {error.message}</div>;
  }

  const renderCourseCard = (course: any) => (
    <Card key={course.id} className="mb-4">
      <div className="flex flex-col sm:flex-row">
        {/* 课程封面 */}
        <div className="w-full sm:w-48 h-50 sm:h-full relative">
          {course.coverUrl ? (
            <CosImage
              path={course.coverUrl}
              width={200}
              height={500}
              
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
              无封面
            </div>
          )}
        </div>

        {/* 课程信息 */}
        <div className="flex-1 p-4">
          <div className="flex flex-col sm:flex-row justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{course.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{course.summary}</p>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0 self-start">
              <Tag color={levelColors[course.level as keyof typeof levelColors]}>
                {levelLabels[course.level as keyof typeof levelLabels]}
              </Tag>
              {course.oneTimePayment && (
                <Tag color="blue">一次性支付</Tag>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-600">
            <div>讲师：{course.instructor}</div>
            <div>分类：{course.category?.name}</div>
            <div>方向：{course.direction?.name}</div>
            <div>课件数：{Array.isArray(course.courseware) ? course.courseware.length : 0}</div>
            <div>创建时间：{new Date(course.createdAt).toLocaleDateString()}</div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link 
              href={`/courses/${course.id}`}
              className="text-cyan-500 hover:text-cyan-600 flex items-center gap-2 justify-center"
              target="_blank"
            >
              查看课程
            </Link>
            <Button type="link" onClick={() => handleEditChapter(course)}>
              管理课程章节
            </Button>
            <Button type="link" onClick={() => handleEdit(course)}>
              编辑
            </Button>
            {/* <Popconfirm
              title="确定要删除这个课程吗？"
              onConfirm={() => handleDelete(course.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm> */}
          </div>
        </div>
      </div>
    </Card>
  );

  // 我的课程卡片

  return (
    <div className="p-4 sm:p-6">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
         
          {
            key: 'manage',
            label: '课程管理',
            children: (
              <div>
                {/* 搜索和操作区域 */}
                <Card className="mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">搜索课程</label>
                      <Search
                        placeholder="输入课程标题或描述关键词"
                        onSearch={handleSearch}
                        style={{ width: 200 }}
                        allowClear
                      />
                    </div>
                    <Button type="primary" icon={<Plus />} onClick={showModal}>
                      添加课程
                    </Button>
                  </div>
                </Card>



                {/* 统计信息 */}
                <div className="mb-4 text-sm text-gray-600">
                  共 {pagination.total} 门课程，第 {pagination.page} 页，每页 {pagination.pageSize} 条
                </div>

                {/* 加载状态 */}
                {loading ? (
                  <div className="flex justify-center items-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {/* 课程列表 */}
                    <div className="space-y-4 mb-6">
                      {courses.length > 0 ? (
                        courses.map(renderCourseCard)
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          暂无课程数据
                        </div>
                      )}
                    </div>

                    {/* 分页组件 */}
                    {pagination.total > 0 && (
                      <div className="flex justify-center">
                        <Pagination
                          current={pagination.page}
                          total={pagination.total}
                          pageSize={pagination.pageSize}
                          showSizeChanger
                          showQuickJumper
                          showTotal={(total, range) => 
                            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                          }
                          onChange={handlePageChange}
                          pageSizeOptions={['12', '24', '48', '96']}
                        />
                      </div>
                    )}
                  </>
                )}

                <AddCourseModal
                  visible={isModalVisible}
                  onClose={handleModalClose}
                  editingCourse={editingCourse}
                />

                <ChapterModal
                  open={isChapterModalOpen}
                  onCancel={() => setIsChapterModalOpen(false)}
                  courseId={selectedCourseId!}
                />
              </div>
            ),
          },
          
        ]}
      />
    </div>
  );
} 