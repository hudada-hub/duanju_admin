import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Input, Button, Table, Space, Upload, InputNumber, Progress, Checkbox } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';
import Swal from 'sweetalert2';
import { CosVideo } from './CosVideo';
import VideoMultiCoverCapture, { MultiCover } from './VideoMultiCoverCapture';
import { FaUpload, FaSpinner, FaImage, FaTimes } from 'react-icons/fa';
import { getToken } from '@/utils/request';
import { CosImage } from './CosImage';

const VIDEO_ACCEPTED_TYPES = [
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/ogg',
];

// 自定义图片上传组件
interface CustomImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  placeholder?: string;
}

const CustomImageUploader: React.FC<CustomImageUploaderProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '点击或拖拽上传封面图片'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = async (file: File) => {
    try {
      setError('');
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const response = await fetch('/api/common/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      const result = await response.json();
      if (result.code === 0) {
        onChange(result.data.url);
      } else {
        setError(result.message || '上传失败');
      }
    } catch (err) {
      setError('上传失败，请重试');
      console.error('上传失败:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('请上传图片文件');
        return;
      }
      handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('请上传图片文件');
        return;
      }
      handleUpload(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}
          ${error ? 'border-red-500' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('cover-upload')?.click()}
      >
        <input
          id="cover-upload"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        {isUploading ? (
          <div className="flex flex-col items-center py-4">
            <FaSpinner className="animate-spin text-2xl text-blue-500 mb-2" />
            <span className="text-gray-600">上传中...</span>
          </div>
        ) : value ? (
          <div className="relative group">
            <div className="relative w-full">
              <CosImage
                path={value}
                width={200}
                height={200}
                className="object-cover rounded"
              />
            </div>
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <FaTimes />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8">
            <FaImage className="text-4xl text-gray-400 mb-2" />
            <p className="text-gray-600">{placeholder}</p>
            <p className="text-sm text-gray-500 mt-1">支持拖拽上传</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};
interface ChapterModalProps {
  open: boolean;
  onCancel: () => void;
  courseId: number;
}

// 章节数据类型
interface ChapterData {
  id: number;
  title: string;
  description?: string;
  videoUrl?: string;
  points: number;
  sort: number;
  children?: ChapterData[];
  parentId?: number;
  selectTotalPoints?: boolean; // 是否选择总积分
  totalPoints?: number; // 总积分
  uploader?: {
    id: number;
    name: string;
    avatar?: string;
  };
  createdAt: string;
}

const ChapterModal: React.FC<ChapterModalProps> = ({ open, onCancel, courseId }) => {
  const [form] = Form.useForm();
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  const [editingChapter, setEditingChapter] = useState<ChapterData | null>(null);
  const [isSubChapterModalOpen, setIsSubChapterModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [parentChapterInfo, setParentChapterInfo] = useState<ChapterData | null>(null); // 添加父章节信息状态
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState<number | undefined>(undefined); // 新增
  // 在组件内添加状态
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const coverCaptureRef = useRef<{ handleCapture: () => Promise<void> }>(null);
  // 多帧抓取相关
  const multiCoverRef = useRef<{ handleCapture: () => Promise<MultiCover[]> }>(null);
  const [coverCandidates, setCoverCandidates] = useState<MultiCover[]>([]);
  // 短剧信息状态
  const [courseInfo, setCourseInfo] = useState<any>(null);
  // 添加加载状态
  const [loading, setLoading] = useState(false);
  // 你可以在这里定义默认水印图片
  const defaultWatermarkUrl = '/watermark.png'; // 放在 public 目录下

  // 工具函数：将图片 url 转为 File
  async function urlToFile(url: string, filename: string): Promise<File> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  }

  // 在组件内 useState 保存水印 File
  const [watermarkFile, setWatermarkFile] = useState<File | undefined>(undefined);

  // 初始化默认水印
  useEffect(() => {
    if (!watermarkFile) {
      urlToFile(defaultWatermarkUrl, 'watermark.png').then(setWatermarkFile);
    }
  }, [watermarkFile]);

  // 获取短剧信息
  const fetchCourseInfo = async () => {
    try {
      const response = await request(`/shorts/${courseId}`, {
        method: 'GET',
      });
      setCourseInfo(response.data);
    } catch (error) {
      console.error('获取短剧信息失败:', error);
    }
  };

  // 获取章节列表
  const fetchChapters = async () => {
    try {
      const response = await request< ChapterData[]>(`/shorts/${courseId}/chapters`, {
        method: 'GET',
      });
      console.log(response.data,'response.data.data')
      
      // 按照sort字段排序
      const sortedChapters = response.data.sort((a:any, b:any) => {
        // 首先按sort字段排序
        if (a.sort !== b.sort) {
          return a.sort - b.sort;
        }
        // 如果sort相同，按创建时间排序
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      
      setChapters(sortedChapters);
      // 更新展开的行
      const keys = sortedChapters.map((chapter:any)  => chapter.id);
      setExpandedKeys(keys);
    } catch (error) {
      console.log(error,'error')
      Swal.fire({
        title: '获取章节列表失败',
        icon: 'error',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        position: 'top-end',
        toast: true
      });
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([fetchCourseInfo(), fetchChapters()]).finally(() => {
        setLoading(false);
      });
    }
  }, [open, courseId]);

  // 添加一个函数来重新获取章节列表（带加载状态）
  const refreshChapters = async () => {
    setLoading(true);
    try {
      await fetchChapters();
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    // {
    //   title: '描述',
    //   dataIndex: 'description',
    //   key: 'description',
    // },
    {
      title: '积分设置',
      key: 'pointsInfo',
      render: (_: any, record: ChapterData) => {
        // 如果短剧是一次性支付，显示无需设置积分
        if (courseInfo?.oneTimePayment) {
          return <span className="text-gray-500">无需设置积分</span>;
        }
        
        if (!record.parentId) {
          // 父章节显示总积分设置
          return record.selectTotalPoints 
            ? `总积分: ${record.totalPoints || 0}` 
            : '按子章节积分';
        } else {
          // 子章节显示单个积分
          return `积分: ${record.points}`;
        }
      },
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ChapterData) => (
        <Space size="middle">
          {!record.parentId && (
            <Button type="link" onClick={() => handleAddSubChapter(record.id)}>
              添加子章节
            </Button>
          )}
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 处理添加主章节
  const handleAddMainChapter = () => {
    setEditingChapter(null);
    setSelectedParentId(null);
    setParentChapterInfo(null); // 重置父章节信息
    setVideoUrl(''); // 重置视频URL
    setCoverUrl(''); // 重置封面URL
    setCoverCandidates([]); // 重置封面候选列表
    setDuration(undefined); // 重置视频时长
    form.resetFields();
    setIsSubChapterModalOpen(true);
  };

  // 处理添加子章节
  const handleAddSubChapter = (parentId: number) => {
    setEditingChapter(null);
    setSelectedParentId(parentId);
    // 查找父章节信息
    const parentChapter = chapters.find(ch => ch.id === parentId);
    setParentChapterInfo(parentChapter || null);
    setVideoUrl(''); // 重置视频URL
    setCoverUrl(''); // 重置封面URL
    setCoverCandidates([]); // 重置封面候选列表
    setDuration(undefined); // 重置视频时长
    form.resetFields();
    setIsSubChapterModalOpen(true);
  };

  // 处理编辑章节
  const handleEdit = (chapter: ChapterData) => {
    setEditingChapter(chapter);
    setSelectedParentId(chapter.parentId || null);
    
    // 如果是子章节，查找父章节信息
    if (chapter.parentId) {
      const parentChapter = chapters.find(ch => ch.id === chapter.parentId);
      setParentChapterInfo(parentChapter || null);
    } else {
      setParentChapterInfo(null);
    }
    
    setVideoUrl(chapter.videoUrl || '');
    setCoverUrl((chapter as any).coverUrl || ''); // 编辑时回显封面
    form.setFieldsValue({
      title: chapter.title,
      description: chapter.description,
      points: chapter.points,
      sort: chapter.sort,
      selectTotalPoints: chapter.selectTotalPoints || false,
      totalPoints: chapter.totalPoints,
      videoUrl: chapter.videoUrl,
    });
    setIsSubChapterModalOpen(true);
  };

  // 处理删除章节
  const handleDelete = async (id: number) => {
    try {
      // 检查是否有子章节
      const hasChildren = chapters.some(chapter => chapter.parentId === id);
      if (hasChildren) {
        Swal.fire({
          title: '无法删除',
          text: '请先删除所有子章节',
          icon: 'error',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
        return;
      }

      // 显示确认弹窗
      const result = await Swal.fire({
        title: '确认删除',
        text: '确定要删除这个章节吗？此操作不可恢复！',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
      });

      // 如果用户确认删除
      if (result.isConfirmed) {
        await request(`/shorts/${courseId}/chapters/${id}`, {
          method: 'DELETE',
        });
        
        // 更新短剧总时长
        try {
          await request(`/shorts/${courseId}/update-total-duration`, {
            method: 'POST',
          });
        } catch (error) {
          console.error('更新短剧总时长失败:', error);
        }
        
        Swal.fire({
          title: '删除成功',
          icon: 'success',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
        
        await refreshChapters();
      }
    } catch (error:any) {
      Swal.fire({
        title: '删除失败',
        text: error.message,
        icon: 'error',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        position: 'top-end',
        toast: true
      });
    }
  };

  // 处理删除视频
  const handleRemoveVideo = () => {
    setVideoUrl('');
    setCoverUrl(''); // 删除视频时同步清空封面
    setCoverCandidates([]); // 删除视频时同步清空封面候选列表
    setDuration(undefined); // 删除视频时同步清空视频时长
    form.setFieldValue('videoUrl', '');
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      let values = await form.validateFields();
      console.log(values,'values')
      if(videoUrl){
        values.videoUrl = videoUrl;
      }
      
      if(coverUrl){
        values.coverUrl = coverUrl;
      }
      
      const data = {
        ...values,
        courseId,
        parentId: selectedParentId,
        duration: duration,
        // 处理积分相关字段
        selectTotalPoints: !selectedParentId ? (values.selectTotalPoints || false) : undefined,
        totalPoints: !selectedParentId && values.selectTotalPoints ? values.totalPoints : undefined,
        points: selectedParentId && !parentChapterInfo?.selectTotalPoints ? values.points : 0,
      };
      
      console.log(coverUrl,'coverUrl')
     
      if (editingChapter) {
        await request(`/shorts/${courseId}/chapters/${editingChapter.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        Swal.fire({
          icon: 'success',
          title: '更新成功',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
      } else {
        await request(`/shorts/${courseId}/chapters`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        Swal.fire({
          icon: 'success',
          title: '创建成功',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
      }

      // 更新短剧总时长
      try {
        await request(`/shorts/${courseId}/update-total-duration`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('更新短剧总时长失败:', error);
      }

      setIsSubChapterModalOpen(false);
      await refreshChapters();
    } catch (error:any) {
      Swal.fire({
        icon: 'error',
        title: '操作失败',
        text: error?.message || '请重试',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        position: 'top-end',
        toast: true
      });
    }
  };

  // 自定义上传方法


  // 上传视频配置
  

  // 重置表单和状态
  const handleModalClose = () => {
    setVideoUrl('');
    setCoverUrl(''); // 重置封面URL
    setCoverCandidates([]); // 重置封面候选列表
    setDuration(undefined); // 重置视频时长
    setParentChapterInfo(null); // 重置父章节信息
    setIsSubChapterModalOpen(false);
    form.resetFields();
  };

  return (
    <>
      <Modal
        title="短剧章节管理"
        open={open}
        onCancel={onCancel}
        width={1200}
        footer={[
          <Button key="add" type="primary" onClick={handleAddMainChapter}>
            新建主章节
          </Button>,
          <Button key="close" onClick={onCancel}>
            关闭
          </Button>,
        ]}
      >
        <Table
          loading={loading}
          columns={columns}
          dataSource={chapters}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: loading ? '加载中...' : '暂无章节数据'
          }}
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpandedRowsChange: (keys) => setExpandedKeys(keys as number[]),
            childrenColumnName: 'children'
          }}
        />
      </Modal>

      <Modal
        title={`${editingChapter ? '编辑' : '新建'}${selectedParentId ? '子' : '主'}章节`}
        open={isSubChapterModalOpen}
        onOk={handleSubmit}
        onCancel={handleModalClose}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input />
          </Form.Item>
{/* 
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item> */}

          {/* 父章节的积分设置 - 仅当短剧不是一次性支付时显示 */}
          {!selectedParentId && !courseInfo?.oneTimePayment && (
            <>
              <Form.Item
                name="selectTotalPoints"
                valuePropName="checked"
                initialValue={false}
              >
                <Checkbox>
                  选择总积分
                  <div className="text-sm text-gray-500 mt-1">
                    勾选后，整个章节使用总积分，否则按子章节分别计费
                  </div>
                </Checkbox>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.selectTotalPoints !== currentValues.selectTotalPoints
                }
              >
                {({ getFieldValue }) => {
                  const selectTotalPoints = getFieldValue('selectTotalPoints');
                  return selectTotalPoints ? (
                    <Form.Item
                      name="totalPoints"
                      label="总积分"
                      rules={[{ required: true, message: '请输入总积分' }]}
                    >
                      <InputNumber min={0} precision={0} placeholder="请输入总积分" />
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>
            </>
          )}

          {/* 子章节的积分设置 - 仅当短剧不是一次性支付且父章节未选择总积分时显示 */}
          {selectedParentId && !courseInfo?.oneTimePayment && !parentChapterInfo?.selectTotalPoints && (
          <Form.Item
            name="points"
            label="积分"
            rules={[{ required: true, message: '请输入积分' }]}
          >
              <InputNumber min={0} precision={0} placeholder="请输入积分" />
          </Form.Item>
          )}

          {/* 如果父章节选择了总积分，显示提示信息 */}
          {selectedParentId && !courseInfo?.oneTimePayment && parentChapterInfo?.selectTotalPoints && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-700 text-sm">
                父章节已设置总积分为 {parentChapterInfo.totalPoints} 分，子章节无需单独设置积分
              </p>
            </div>
          )}

          {/* 当短剧是一次性支付时，显示提示信息 */}
          {courseInfo?.oneTimePayment && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-700 text-sm">
                该短剧已设置为一次性支付，无需设置章节积分
              </p>
            </div>
          )}

          <Form.Item
            name="sort"
            label="排序"
          >
            <InputNumber min={0} precision={0} placeholder="请输入排序（可选）" />
          </Form.Item>

          {/* 只有子章节才显示视频上传 */}
          {selectedParentId && (
            <Form.Item 
              name="videoUrl" 
              label="视频"
              rules={[{ required: true, message: '请上传视频' }]}
              extra="支持 mp4, mov, avi, wmv 格式，大小不超过500MB"
            >
              <div className="space-y-4">
                {!videoUrl ? (
                  <Upload
                    showUploadList={false}
                    beforeUpload={async (file) => {
                      // 1. 校验格式
                      if (!VIDEO_ACCEPTED_TYPES.includes(file.type)) {
                        Swal.fire({
                          icon: 'error',
                          title: '不支持的文件格式',
                          text: '请上传支持格式的视频',
                          showConfirmButton: false,
                          timer: 3000,
                          timerProgressBar: true,
                          position: 'top-end',
                          toast: true
                        });
                        return false;
                      }
                      // 2. 校验原生video可播放性和获取duration
                      const url = URL.createObjectURL(file);
                      let videoDuration = 0;
                      const canPlay = await new Promise<boolean>((resolve) => {
                        const testVideo = document.createElement('video');
                        testVideo.preload = 'metadata';
                        testVideo.src = url;
                        testVideo.onloadedmetadata = () => {
                          videoDuration = testVideo.duration;
                          resolve(true);
                        };
                        testVideo.onerror = () => resolve(false);
                      });
                      URL.revokeObjectURL(url);
                      if (!canPlay || !videoDuration || isNaN(videoDuration)) {
                        Swal.fire({
                          icon: 'error',
                          title: '无法识别视频或视频损坏',
                          text: '请重新选择有效的视频文件',
                          showConfirmButton: false,
                          timer: 3000,
                          timerProgressBar: true,
                          position: 'top-end',
                          toast: true
                        });
                        return false;
                      }
                      setDuration(videoDuration);
                      setUploading(true);
                      setUploadPercent(0);
                      const formData = new FormData();
                      formData.append('file', file);
                      return new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/api/common/upload', true);
                        xhr.upload.onprogress = (event) => {
                          console.log(event,'event')
                          if (event.lengthComputable) {
                            const percent = Math.round((event.loaded / event.total) * 100);
                            console.log(percent,'percent')
                            setUploadPercent(percent);
                          }
                        };
                        xhr.onload = () => {
                          setUploading(false);
                          setUploadPercent(0);
                          try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.code === 0 && data.data?.url) {
                              console.log(data.data.url,'data.data.url')
                              setVideoUrl(data.data.url);
                              Swal.fire({
                                icon: 'success',
                                title: '上传成功',
                                showConfirmButton: false,
                                timer: 3000,
                                timerProgressBar: true,
                                position: 'top-end',
                                toast: true
                              });
                              setCoverUrl(''); // 上传新视频时重置封面，防止脏数据
                              setCoverCandidates([]);
                              
                              // 如果标题为空，自动设置文件名为标题
                              const currentTitle = form.getFieldValue('title');
                              if (!currentTitle || currentTitle.trim() === '') {
                                const fileName = file.name.replace(/\.[^/.]+$/, ''); // 移除文件扩展名
                                form.setFieldsValue({ title: fileName });
                              }
                              
                              if (multiCoverRef.current) {
                                Swal.fire({
                                  title: '正在抓取视频多帧...',
                                  text: '请稍候',
                                  allowOutsideClick: false,
                                  didOpen: () => {
                                    Swal.showLoading();
                                  }
                                });
                                multiCoverRef.current.handleCapture().then(async (covers: MultiCover[]) => {
  // 遍历上传到COS
  const uploadPromises = covers.map((item) => {
    const formData = new FormData();
    formData.append('file', item.blob, 'cover.jpg');
    return fetch('/api/common/upload', {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  });
  const results = await Promise.all(uploadPromises);
  const cosCovers: MultiCover[] = covers.map((item, idx) => {
    const url = results[idx]?.code === 0 && results[idx]?.data?.url ? results[idx].data.url : '';
    return { ...item, cosUrl: url };
  }).filter(item => !!item.cosUrl);
  setCoverCandidates(cosCovers);
  if (cosCovers.length > 0) {
    // 自动选择第一张封面
    setCoverUrl(cosCovers[0].cosUrl || '');
    Swal.fire({
      icon: 'success',
      title: '抓取封面成功，已自动选择第一张封面',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      position: 'top-end',
      toast: true
    });
  } else {
    Swal.fire({
      icon: 'error',
      title: '未能抓取到有效封面',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      position: 'top-end',
      toast: true
    });
  }
}).catch(() => {
  Swal.fire({
    icon: 'error',
    title: '视频多帧抓取失败',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    position: 'top-end',
    toast: true
  });
});
                              }
                              resolve(false);
                            } else {
                              Swal.fire({
                                icon: 'error',
                                title: data.message || '上传失败',
                                showConfirmButton: false,
                                timer: 3000,
                                timerProgressBar: true,
                                position: 'top-end',
                                toast: true
                              });
                              reject();
                            }
                          } catch {
                            Swal.fire({
                              icon: 'error',
                              title: '上传失败',
                              showConfirmButton: false,
                              timer: 3000,
                              timerProgressBar: true,
                              position: 'top-end',
                              toast: true
                            });
                            reject();
                          }
                        };
                        xhr.onerror = () => {
                          setUploading(false);
                          setUploadPercent(0);
                          Swal.fire({
                            icon: 'error',
                            title: '上传失败',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true,
                            position: 'top-end',
                            toast: true
                          });
                          reject();
                        };
                        xhr.send(formData);
                      });
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={uploading} disabled={uploading}>
                      {uploading ? '上传中...' : '上传视频'}
                    </Button>
                  </Upload>
                ) : (
                  <div className="space-y-4">
                    <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <CosVideo
                        path={videoUrl}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={handleRemoveVideo}
                      >
                        删除视频
                      </Button>
                    </div>
                  </div>
                )}
                {duration !== undefined && (
                  <div className="text-xs text-gray-500 mt-2">视频时长：{duration} 秒</div>
                )}
                {uploading && (
                  <div className="mt-4">
                    <Progress 
                      percent={uploadPercent} 
                      status={uploadPercent === 100 ? 'success' : 'active'}
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                    />
                  </div>
                )}
              {/* 封面选择区域 */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">视频封面</h4>
                
                {/* 手动上传封面 */}
                <div className="mb-4">
                  <h5 className="text-xs text-gray-500 mb-2">手动上传封面</h5>
                  <CustomImageUploader
                    value={coverUrl}
                    onChange={(value)=>{
                      setCoverUrl(value)
                    }}
                    placeholder="点击或拖拽上传自定义封面"
                  />
                </div>

                {/* 多帧候选封面选择 */}
                {coverCandidates.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-xs text-gray-500 mb-2">自动抓取封面（点击选择）</h5>
                    <div className="flex items-center space-x-4">
                      {coverCandidates.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <img
                            src={item.cosUrl}
                            alt={`封面${idx+1}`}
                            style={{
                              width: 120,
                              height: 68,
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: coverUrl === item.cosUrl ? '2px solid #1677ff' : '1px solid #eee',
                              cursor: 'pointer',
                              boxShadow: coverUrl === item.cosUrl ? '0 0 8px #1677ff55' : undefined
                            }}
                            onClick={() => setCoverUrl(item.cosUrl!)}
                          />
                          <span style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{Math.round(item.time)}s</span>
                          {coverUrl === item.cosUrl && <span style={{ color: '#1677ff', fontSize: 12 }}>已选</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 当前选中的封面预览 */}
                {coverUrl && (
                  <div className="mt-2">
                    <h5 className="text-xs text-gray-500 mb-2">当前选中封面</h5>
                    <div className="flex items-center space-x-4">
                      <CosImage  
                        path={coverUrl} 
                        width={120} 
                        height={68} 
                        className="object-cover rounded-lg"
                      />
                      <Button 
                        danger 
                        size="small" 
                        onClick={() => setCoverUrl('')}
                      >
                        删除封面
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <VideoMultiCoverCapture
                ref={multiCoverRef}
                videoUrl={videoUrl}
                count={5}
                onCovers={() => {
                  
                }}
              />
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default ChapterModal; 