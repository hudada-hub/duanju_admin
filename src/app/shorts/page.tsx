'use client';

import { useEffect, useState } from 'react';
import { Button, Table, Drawer, Form, Input, Space, Card, Select, Tag, InputNumber, Switch } from 'antd';
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
import {ShortStatus} from '@prisma/client';

interface Short {
  id: number;
  title: string;
  coverUrl: string;
  summary: string;
  description: string;
  instructor: string;
  viewCount: number;
  isFree: boolean;
  status: 'COMPLETED' | 'ONGOING';
  episodeCount: number;
  totalDuration: number;
  tags: string[];
  likeCount: number;
  favoriteCount: number;
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

// 新增短剧弹窗使用的短剧数据类型
interface ShortForModal {
  id?: number;
  title: string;
  instructor: string;
  description: string;
  categoryId?: number;
  directionId?: number;
  coverUrl: string;
  status: ShortStatus;
  isFree?: boolean;
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingShort, setEditingShort] = useState<Short | null>(null);
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 新增短剧相关状态
  const [addShortModalVisible, setAddShortModalVisible] = useState(false);
  const [editingShortForModal, setEditingShortForModal] = useState<ShortForModal | null>(null);
  
  // 管理章节相关状态
  const [chapterModalVisible, setChapterModalVisible] = useState(false);
  const [selectedShortId, setSelectedShortId] = useState<number | null>(null);
  
  // 筛选参数状态
  const [filterParams, setFilterParams] = useState({
    isFree: undefined as boolean | undefined,
    isDeleted: undefined as boolean | undefined,
    categoryId: undefined as number | undefined,
    directionId: undefined as number | undefined,
  });

  // 获取短剧列表
  const fetchShorts = async (
    page = currentPage, 
    size = pageSize, 
    keyword = searchKeyword,
    isFree?: boolean,
    isDeleted?: boolean,
    categoryId?: number,
    directionId?: number
  ) => {
    setLoading(true);
    try {
      let url = `/shorts?page=${page}&pageSize=${size}`;
      if (keyword) url += `&keyword=${keyword}`;
      if (isFree !== undefined) url += `&isFree=${isFree}`;
      if (isDeleted !== undefined) url += `&isDeleted=${isDeleted}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      if (directionId) url += `&directionId=${directionId}`;
      
      const res = await request(url);
      // 修复数据结构解析
      setShorts(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (error) {
      console.error('获取短剧列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const res = await request('/shorts-categories');
      setCategories(res.data);
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  };

  // 获取方向列表
  const fetchDirections = async () => {
    try {
      const res = await request('/shorts-directions');
      setDirections(res.data);
    } catch (error) {
      console.error('获取方向列表失败:', error);
    }
  };

  useEffect(() => {
    fetchShorts();
    fetchCategories();
    fetchDirections();
  }, []);

  // 打开抽屉进行编辑
  const handleEdit = (record: Short) => {
    setEditingShort(record);
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
    setEditingShort(null);
    form.resetFields();
    form.setFieldValue('coverUrl', []); // 确保清空封面
    setDrawerVisible(true);
  };

  // 新增短剧处理函数
  const handleAddShort = () => {
    setEditingShortForModal(null);
    setAddShortModalVisible(true);
  };

  // 编辑短剧处理函数（使用AddCourseModal）
  const handleEditShort = (record: Short) => {
    // 转换Course对象为AddCourseModal期望的格式
    const shortForModal: ShortForModal = {
      id: record.id,
      title: record.title,
      instructor: record.instructor,
      description: record.description,
      categoryId: record.category?.id,
      directionId: record.direction?.id,
      coverUrl: record.coverUrl,
      status: record.status,
      isFree: record.isFree,
    };
    setEditingShortForModal(shortForModal);
    setAddShortModalVisible(true);
  };

  // 关闭新增短剧弹窗
  const handleCloseAddShortModal = () => {
    setAddShortModalVisible(false);
    setEditingShortForModal(null);
  };

  // 短剧操作成功后的回调
  const handleShortSuccess = () => {
    fetchShorts(); // 刷新短剧列表
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
        await request(`/shorts/${id}`, {
          method: 'DELETE'
        });
        await fetchShorts();
        Swal.fire('成功', '短剧已删除', 'success');
      } catch (error: any) {
        Swal.fire('错误', error.message || '删除失败', 'error');
      }
    }
  };

  // 管理章节处理函数
  const handleManageChapters = (shortId: number) => {
    setSelectedShortId(shortId);
    setChapterModalVisible(true);
  };

  // 关闭章节管理弹窗
  const handleCloseChapterModal = () => {
    setChapterModalVisible(false);
    setSelectedShortId(null);
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
      
      if (editingShort) {
        // 编辑
        await request(`/shorts/${editingShort.id}`, {
          method: 'PUT',
          body: JSON.stringify(values)
        });
      } else {
        // 新增
        await request('/shorts', {
          method: 'POST',
          body: JSON.stringify(values)
        });
      }
      setDrawerVisible(false);
      await fetchShorts();
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('成功', `${editingShort ? '更新' : '创建'}成功`, 'success');
    } catch (error: any) {
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('错误', error.message || `${editingShort ? '更新' : '创建'}失败`, 'error');
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
      title: '置顶',
      dataIndex: 'isTop',
      width: 100,
      render: (isTop: boolean, record: Short) => (
        <Switch
          checked={isTop}
          onChange={async (checked: boolean) => {
            try {
              await request(`/shorts/${record.id}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                  title: record.title,
                  coverUrl: record.coverUrl,
                  description: record.description,
                  instructor: record.instructor,
                  directionId: record.direction.id,
                  categoryId: record.category.id,
                  status: record.status,
                  tags: record.tags,
                  isFree: record.isFree,
                  isTop: checked,
                  isHidden: record.isHidden
                })
              });
              // 刷新列表
              fetchShorts();
              Swal.fire({
                icon: 'success',
                title: '更新成功',
                showConfirmButton: false,
                timer: 1500,
                position: 'top-end',
                toast: true
              });
            } catch (error) {
              Swal.fire({
                icon: 'error',
                title: '更新失败',
                showConfirmButton: false,
                timer: 1500,
                position: 'top-end',
                toast: true
              });
            }
          }}
        />
      ),
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
      title: '时长',
      dataIndex: 'totalDuration',
      width: 100,
      render: (duration: number) => {
        if (!duration || duration === 0) return '0小时';
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        if (hours > 0) {
          return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
        }
        return `${minutes}分钟`;
      },
    },
   
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '是否免费',
      dataIndex: 'isFree',
      width: 100,
      render: (isFree: boolean, record: Short) => (
        <Switch
          checked={isFree}
          onChange={async (checked: boolean) => {
            try {
              await request(`/shorts/${record.id}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                  title: record.title,
                  coverUrl: record.coverUrl,
                  description: record.description,
                  instructor: record.instructor,
                  directionId: record.direction.id,
                  categoryId: record.category.id,
                  status: record.status,
                  tags: record.tags,
                  isFree: checked,
                  isTop: record.isTop,
                  isHidden: record.isHidden
                })
              });
              // 刷新列表
              fetchShorts();
              Swal.fire({
                icon: 'success',
                title: '更新成功',
                showConfirmButton: false,
                timer: 1500,
                position: 'top-end',
                toast: true
              });
            } catch (error) {
              Swal.fire({
                icon: 'error',
                title: '更新失败',
                showConfirmButton: false,
                timer: 1500,
                position: 'top-end',
                toast: true
              });
            }
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 400, // 增加宽度以容纳新按钮
      fixed: 'right' as const,
      render: (_: any, record: Short) => (
        <Space>
          <Button 
            type="link"
            onClick={() => {
              const frontUrl = process.env.NEXT_PUBLIC_FRONT_BASE_URL;
              if (frontUrl) {
                window.open(`${frontUrl}/shorts/${record.id}`, '_blank');
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
            onClick={() => handleEditShort(record)}
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
                  fetchShorts(1, pageSize, value);
                }}
                style={{ width: 200 }}
              />
            </Space>
            
            <Space>
              {/* 新增短剧按钮 */}
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddShort}
              >
                新增短剧
              </Button>
            </Space>
          </div>

          {/* 筛选区域 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap items-end gap-4">
              {/* 是否免费筛选 */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">是否免费</label>
                <Select
                  placeholder="全部"
                  allowClear
                  style={{ width: '100%' }}
                  value={filterParams.isFree}
                  onChange={(value) => setFilterParams(prev => ({ ...prev, isFree: value }))}
                >
                  <Select.Option value={true}>免费</Select.Option>
                  <Select.Option value={false}>付费</Select.Option>
                </Select>
              </div>

              {/* 是否删除筛选 */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">删除状态</label>
                <Select
                  placeholder="全部"
                  allowClear
                  style={{ width: '100%' }}
                  value={filterParams.isDeleted}
                  onChange={(value) => setFilterParams(prev => ({ ...prev, isDeleted: value }))}
                >
                  <Select.Option value={false}>正常</Select.Option>
                  <Select.Option value={true}>已删除</Select.Option>
                </Select>
              </div>

              {/* 短剧分类筛选 */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">短剧分类</label>
                <Select
                  placeholder="全部"
                  allowClear
                  style={{ width: '100%' }}
                  value={filterParams.categoryId}
                  onChange={(value) => setFilterParams(prev => ({ ...prev, categoryId: value }))}
                >
                  {categories.map(category => (
                    <Select.Option key={category.id} value={category.id}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* 短剧方向筛选 */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">短剧方向</label>
                <Select
                  placeholder="全部"
                  allowClear
                  style={{ width: '100%' }}
                  value={filterParams.directionId}
                  onChange={(value) => setFilterParams(prev => ({ ...prev, directionId: value }))}
                >
                  {directions.map(direction => (
                    <Select.Option key={direction.id} value={direction.id}>
                      {direction.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* 搜索和重置按钮 */}
              <div className="flex gap-2">
                <Button 
                  type="primary" 
                  onClick={() => {
                    setCurrentPage(1);
                    fetchShorts(1, pageSize, searchKeyword, filterParams.isFree, filterParams.isDeleted, filterParams.categoryId, filterParams.directionId);
                  }}
                >
                  搜索
                </Button>
                <Button 
                  onClick={() => {
                    setFilterParams({
                      isFree: undefined,
                      isDeleted: undefined,
                      categoryId: undefined,
                      directionId: undefined
                    });
                    setCurrentPage(1);
                    fetchShorts(1, pageSize, searchKeyword);
                  }}
                >
                  重置
                </Button>
              </div>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={shorts}
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
                fetchShorts(page, size);
              },
            }}
          />

          {/* 原有的编辑抽屉 */}
          <Drawer
            title={editingShort ? '编辑短剧' : '新增短剧'}
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
                label="导演"
                rules={[{ required: true, message: '请输入导演名称' }]}
              >
                <Input placeholder="请输入导演名称" />
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

          {/* 新增短剧弹窗 */}
          <AddCourseModal
            visible={addShortModalVisible}
            onClose={handleCloseAddShortModal}
            editingCourse={editingShortForModal}
            onSuccess={handleShortSuccess}
          />

          {/* 章节管理弹窗 */}
          <ChapterModal
            open={chapterModalVisible}
            onCancel={handleCloseChapterModal}
            courseId={selectedShortId || 0}
          />
        </Card>
      </div>
    </AdminLayout>
  );
} 