'use client';

import { useEffect, useState } from 'react';
import { Button, Table, Drawer, Form, Input, Space, Card, Select, Tag, InputNumber } from 'antd';
import { request } from '@/utils/request';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

const WangEditor = dynamic(() => import('@/components/WangEditor'), {
  ssr: false,
  loading: () => <div>加载中...</div>
});

// 导入AddCourseModal组件
import AddCourseModal from './components/AddCourseModal';
// 导入ChapterModal组件
import ChapterModal from './components/ChapterModal';
import AdminLayout from '../components/layout/AdminLayout';
import { FileUpload } from '@/components/ui/upload';
import { CosImage } from '../components/common/CosImage';

interface Course {
  id: number;
  title: string;
  coverUrl: string;
  summary: string;
  description: string;
  instructor: string;
  viewCount: number;
  studentCount: number;
  watermarkType: 'IMAGE' | 'TEXT';
  watermarkContent: string;
  watermarkPosition: 'FULLSCREEN' | 'MOVING' | 'TOP_LEFT' | 'TOP_RIGHT' | 'CENTER' | 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'COMPLETED' | 'ONGOING';
  episodeCount: number;
  totalDuration: number;
  tags: string[];
  targetAudience: string;
  ratingScore: number;
  likeCount: number;
  favoriteCount: number;
  courseGoals: string;
  isTop: boolean;
  isDeleted: boolean;
  isHidden: boolean;
  category: {
    id: number;
    name: string;
  };
  direction: {
    id: number;
    name: string;
  };
  createdAt: string;
}

interface Category {
  id: number;
  name: string;
}

interface Direction {
  id: number;
  name: string;
}

// 新增课程弹窗使用的课程数据类型
interface CourseForModal {
  id?: number;
  title: string;
  instructor: string;
  description: string;
  categoryId?: number;
  directionId?: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  targetAudience: string;
  courseGoals: string;
  coverUrl: string;
  watermarkType?: 'IMAGE' | 'TEXT';
  watermarkContent?: string;
  watermarkPosition?: 'FULLSCREEN' | 'MOVING' | 'TOP_LEFT' | 'TOP_RIGHT' | 'CENTER' | 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
  oneTimePayment: boolean;
  oneTimePoint: number;
  courseware: any[];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 新增课程相关状态
  const [addCourseModalVisible, setAddCourseModalVisible] = useState(false);
  const [editingCourseForModal, setEditingCourseForModal] = useState<CourseForModal | null>(null);
  
  // 管理章节相关状态
  const [chapterModalVisible, setChapterModalVisible] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // 获取短剧列表
  const fetchCourses = async (page = currentPage, size = pageSize, keyword = searchKeyword) => {
    setLoading(true);
    try {
      const res = await request(`/courses?page=${page}&pageSize=${size}&keyword=${keyword}`);
      setCourses(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      console.error('获取短剧列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const res = await request('/course-categories');
      setCategories(res.data);
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  };

  // 获取方向列表
  const fetchDirections = async () => {
    try {
      const res = await request('/course-directions');
      setDirections(res.data);
    } catch (error) {
      console.error('获取方向列表失败:', error);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchCategories();
    fetchDirections();
  }, []);

  // 打开抽屉进行编辑
  const handleEdit = (record: Course) => {
    setEditingCourse(record);
    form.setFieldsValue({
      ...record,
      tags: record.tags.join(','), // 将数组转换为逗号分隔的字符串
      coverUrl: [{
        uid: '-1',
        name: 'cover.png',
        status: 'done',
        url: record.coverUrl,
      }]
    });
    setDrawerVisible(true);
  };

  // 打开抽屉进行新增
  const handleAdd = () => {
    setEditingCourse(null);
    form.resetFields();
    form.setFieldValue('coverUrl', []); // 确保清空封面
    setDrawerVisible(true);
  };

  // 新增课程处理函数
  const handleAddCourse = () => {
    setEditingCourseForModal(null);
    setAddCourseModalVisible(true);
  };

  // 编辑课程处理函数（使用AddCourseModal）
  const handleEditCourse = (record: Course) => {
    // 转换Course对象为AddCourseModal期望的格式
    const courseForModal: CourseForModal = {
      id: record.id,
      title: record.title,
      instructor: record.instructor,
      description: record.description,
      categoryId: record.category?.id,
      directionId: record.direction?.id,
      level: record.level,
      targetAudience: record.targetAudience,
      courseGoals: record.courseGoals,
      coverUrl: record.coverUrl,
      watermarkType: record.watermarkType,
      watermarkContent: record.watermarkContent,
      watermarkPosition: record.watermarkPosition,
      oneTimePayment: false, // 默认值
      oneTimePoint: 0, // 默认值
      courseware: [] // 默认空数组
    };
    setEditingCourseForModal(courseForModal);
    setAddCourseModalVisible(true);
  };

  // 关闭新增课程弹窗
  const handleCloseAddCourseModal = () => {
    setAddCourseModalVisible(false);
    setEditingCourseForModal(null);
  };

  // 课程操作成功后的回调
  const handleCourseSuccess = () => {
    fetchCourses(); // 刷新课程列表
  };

  // 删除短剧
  const handleDelete = async (id: number) => {
    if (typeof window === 'undefined') return;
    
    const Swal = (await import('sweetalert2')).default;
    const result = await Swal.fire({
      title: '确认删除',
      text: '确定要删除这个短剧吗？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      try {
        await request(`/courses/${id}`, {
          method: 'DELETE'
        });
        await fetchCourses();
        Swal.fire('成功', '短剧已删除', 'success');
      } catch (error: any) {
        Swal.fire('错误', error.message || '删除失败', 'error');
      }
    }
  };

  // 管理章节处理函数
  const handleManageChapters = (courseId: number) => {
    setSelectedCourseId(courseId);
    setChapterModalVisible(true);
  };

  // 关闭章节管理弹窗
  const handleCloseChapterModal = () => {
    setChapterModalVisible(false);
    setSelectedCourseId(null);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // 处理tags，将逗号分隔的字符串转换为数组
      values.tags = values.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      
      // 处理封面URL
      const coverFile = form.getFieldValue('coverUrl')?.[0];
      // values.coverUrl = coverFile?.response?.data?.url || coverFile?.url;

      let coverUrl = form.getFieldValue('coverUrl')?.[0]?.url;
      delete coverUrl.file.thumbUrl;
      delete coverUrl.fileList[0].thumbUrl;
      console.log(coverUrl,'222');
      if (!values.coverUrl) {
        const Swal = (await import('sweetalert2')).default;
        return Swal.fire('错误', '请上传短剧封面', 'error');
      }
      
      if (editingCourse) {
        // 编辑
        await request(`/courses/${editingCourse.id}`, {
          method: 'PUT',
          body: JSON.stringify(values)
        });
      } else {
        // 新增
        await request('/courses', {
          method: 'POST',
          body: JSON.stringify(values)
        });
      }
      setDrawerVisible(false);
      await fetchCourses();
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('成功', `${editingCourse ? '更新' : '创建'}成功`, 'success');
    } catch (error: any) {
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('错误', error.message || `${editingCourse ? '更新' : '创建'}失败`, 'error');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '短剧标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '封面',
      dataIndex: 'coverUrl',
      width: 100,
      render: (url: string) => (
        <div className="flex items-center justify-center">  
        
          <CosImage path={url} width={60} height={40} />
        </div>
      ),
    },
    {
      title: '讲师',
      dataIndex: 'instructor',
      width: 100,
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      width: 100,
    },
    {
      title: '方向',
      dataIndex: ['direction', 'name'],
      width: 100,
    },
    {
      title: '难度',
      dataIndex: 'level',
      width: 100,
      render: (level: string) => {
        const levelMap = {
          BEGINNER: '初级',
          INTERMEDIATE: '中级',
          ADVANCED: '高级'
        };
        return levelMap[level as keyof typeof levelMap];
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          COMPLETED: <Tag color="success">已完结</Tag>,
          ONGOING: <Tag color="processing">连载中</Tag>
        };
        return statusMap[status as keyof typeof statusMap];
      },
    },
    {
      title: '集数',
      dataIndex: 'episodeCount',
      width: 80,
    },
    {
      title: '时长(分钟)',
      dataIndex: 'totalDuration',
      width: 100,
    },
   
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 400, // 增加宽度以容纳新按钮
      fixed: 'right' as const,
      render: (_: any, record: Course) => (
        <Space>
          <Button 
            type="link"
            onClick={() => {
              const frontUrl = process.env.NEXT_PUBLIC_FRONT_BASE_URL;
              if (frontUrl) {
                window.open(`${frontUrl}/courses/${record.id}`, '_blank');
              }
            }}
          >
            查看
          </Button>
          <Button 
            type="link"
            onClick={() => handleManageChapters(record.id)}
          >
            管理短剧章节
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditCourse(record)}
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
          <div className="mb-4 flex justify-between">
            <Space>
              <Input.Search
                placeholder="搜索短剧标题"
                allowClear
                onSearch={(value) => {
                  setSearchKeyword(value);
                  setCurrentPage(1);
                  fetchCourses(1, pageSize, value);
                }}
                style={{ width: 200 }}
              />
            </Space>
            
            {/* 新增课程按钮 */}
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddCourse}
            >
              新增课程
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={courses}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
                fetchCourses(page, size);
              },
            }}
          />

          {/* 原有的编辑抽屉 */}
          <Drawer
            title={editingCourse ? '编辑短剧' : '新增短剧'}
            open={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            width={720}
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
                name="title"
                label="短剧标题"
                rules={[{ required: true, message: '请输入短剧标题' }]}
              >
                <Input placeholder="请输入短剧标题" />
              </Form.Item>

              <Form.Item
                label="短剧封面"
                name="coverUrl"
                rules={[{  message: '请上传短剧封面' }]}
              >
                <FileUpload 
                  accept="image/*"
                  buttonText="上传封面"
                  onUploadSuccess={(url) => {
                    console.log(url,'111');
                    form.setFieldValue('coverUrl', url);
                  }}
                  listType="picture-card"
                />
              </Form.Item>

              <Form.Item
                name="instructor"
                label="讲师"
                rules={[{ required: true, message: '请输入讲师名称' }]}
              >
                <Input placeholder="请输入讲师名称" />
              </Form.Item>

              <Form.Item
                name="categoryId"
                label="短剧分类"
                rules={[{ required: true, message: '请选择短剧分类' }]}
              >
                <Select placeholder="请选择短剧分类">
                  {categories.map(category => (
                    <Select.Option key={category.id} value={category.id}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="directionId"
                label="短剧方向"
                rules={[{ required: true, message: '请选择短剧方向' }]}
              >
                <Select placeholder="请选择短剧方向">
                  {directions.map(direction => (
                    <Select.Option key={direction.id} value={direction.id}>
                      {direction.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="level"
                label="难度等级"
                rules={[{ required: true, message: '请选择难度等级' }]}
              >
                <Select placeholder="请选择难度等级">
                  <Select.Option value="BEGINNER">初级</Select.Option>
                  <Select.Option value="INTERMEDIATE">中级</Select.Option>
                  <Select.Option value="ADVANCED">高级</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="status"
                label="短剧状态"
                rules={[{ required: true, message: '请选择短剧状态' }]}
              >
                <Select placeholder="请选择短剧状态">
                  <Select.Option value="ONGOING">连载中</Select.Option>
                  <Select.Option value="COMPLETED">已完结</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="episodeCount"
                label="短剧集数"
                rules={[{ required: true, message: '请输入短剧集数' }]}
              >
                <InputNumber min={0} placeholder="请输入短剧集数" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="totalDuration"
                label="总时长(分钟)"
                rules={[{ required: true, message: '请输入总时长' }]}
              >
                <InputNumber min={0} placeholder="请输入总时长" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="tags"
                label="短剧标签"
                help="多个标签用英文逗号分隔"
              >
                <Input placeholder="请输入短剧标签，多个标签用英文逗号分隔" />
              </Form.Item>

              <Form.Item
                name="targetAudience"
                label="适合人群"
                rules={[{ required: true, message: '请输入适合人群' }]}
              >
                <Input.TextArea rows={4} placeholder="请输入适合人群" />
              </Form.Item>

              <Form.Item
                name="courseGoals"
                label="短剧目标"
                rules={[{ required: true, message: '请输入短剧目标' }]}
              >
                <Input.TextArea rows={4} placeholder="请输入短剧目标" />
              </Form.Item>

              <Form.Item
                name="summary"
                label="短剧简介"
              >
                <Input.TextArea rows={4} placeholder="请输入短剧简介" />
              </Form.Item>

              <Form.Item
                name="description"
                label="短剧详情"
                rules={[{ required: true, message: '请输入短剧详情' }]}
              >
                <WangEditor />
              </Form.Item>

              

              

              

              <Form.Item
                name="isTop"
                label="是否置顶"
                valuePropName="checked"
              >
                <Select>
                  <Select.Option value={true}>是</Select.Option>
                  <Select.Option value={false}>否</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="isHidden"
                label="是否隐藏"
                valuePropName="checked"
              >
                <Select>
                  <Select.Option value={true}>是</Select.Option>
                  <Select.Option value={false}>否</Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </Drawer>

          {/* 新增课程弹窗 */}
          <AddCourseModal
            visible={addCourseModalVisible}
            onClose={handleCloseAddCourseModal}
            editingCourse={editingCourseForModal}
            onSuccess={handleCourseSuccess}
          />

          {/* 章节管理弹窗 */}
          <ChapterModal
            open={chapterModalVisible}
            onCancel={handleCloseChapterModal}
            courseId={selectedCourseId || 0}
          />
        </Card>
      </div>
    </AdminLayout>
  );
} 