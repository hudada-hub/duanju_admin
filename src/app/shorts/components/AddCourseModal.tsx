'use client';
import { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Button, Space, Upload, Select, Checkbox, Card, Popconfirm } from 'antd';
import Swal from 'sweetalert2';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { request } from '@/utils/request';
import { useCourseOptions } from '../hooks/useCourseOptions';

// 类型定义
interface Category {
  id: number;
  name: string;
}

interface Direction {
  id: number;
  name: string;
}

interface AddCourseModalProps {
  visible: boolean;
  onClose: () => void;
  editingCourse?: any; // 编辑的课程数据
  onSuccess?: () => void; // 操作成功后的回调函数
}

// 课件数据类型
interface Courseware {
  name: string;
  url: string;
}

export default function AddCourseModal({ visible, onClose, editingCourse, onSuccess }: AddCourseModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [coursewareList, setCoursewareList] = useState<Courseware[]>([]); // 课件列表状态
  const [oneTimePayment, setOneTimePayment] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const { categories, directions, loading: optionsLoading } = useCourseOptions();
  
  // 添加Upload组件的ref
  const uploadRef = useRef<any>(null);

  // 当编辑的课程数据变化时，设置表单数据
  useEffect(() => {
    console.log(editingCourse);
    if (editingCourse) {
      form.setFieldsValue({
        title: editingCourse.title,
        instructor: editingCourse.instructor,
        description: editingCourse.description,
        categoryId: editingCourse.categoryId,
        directionId: editingCourse.directionId,
        level: editingCourse.level,
        targetAudience: editingCourse.targetAudience,
        courseGoals: editingCourse.courseGoals,
        coverUrl: editingCourse.coverUrl,
        watermarkType: editingCourse.watermarkType,
        watermarkContent: editingCourse.watermarkContent,
        watermarkPosition: editingCourse.watermarkPosition,
        oneTimePayment: editingCourse.oneTimePayment || false, // 添加一次性支付字段
        oneTimePoint: editingCourse.oneTimePoint || 0, // 添加一次性支付积分字段
      });
      setCoverUrl(editingCourse.coverUrl);
      setOneTimePayment(editingCourse.oneTimePayment || false);
      setIsFree(editingCourse.oneTimePoint === 0);
      
      // 设置课件列表
      if (editingCourse.courseware && Array.isArray(editingCourse.courseware)) {
        setCoursewareList(editingCourse.courseware);
      } else {
        setCoursewareList([]);
      }
    } else {
      form.resetFields();
      setCoverUrl('');
      setCoursewareList([]); // 重置课件列表
      setOneTimePayment(false);
      setIsFree(false);
      // 重置Upload组件
      if (uploadRef.current) {
        uploadRef.current.fileList = [];
      }
    }
  }, [editingCourse, form]);

  // 添加课件
  const handleAddCourseware = () => {
    setCoursewareList([...coursewareList, { name: '', url: '' }]);
  };

  // 删除课件
  const handleRemoveCourseware = (index: number) => {
    const newList = coursewareList.filter((_, i) => i !== index);
    setCoursewareList(newList);
  };

  // 更新课件信息
  const handleCoursewareChange = (index: number, field: 'name' | 'url', value: string) => {
    const newList = [...coursewareList];
    newList[index][field] = value;
    setCoursewareList(newList);
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // 过滤掉空的课件项
      const validCourseware = coursewareList.filter(item => item.name.trim() && item.url.trim());
      
      const submitData = {
        ...values,
        coverUrl,
        courseware: validCourseware, // 添加课件数据
        // 确保 oneTimePoint 是数字类型
        oneTimePoint: parseInt(values.oneTimePoint) || 0,
      };
      
      if (editingCourse) {
        // 编辑课程
        await request(`/courses/${editingCourse.id}`, {
          method: 'PUT',
          body: JSON.stringify(submitData),
        });
        Swal.fire({
          icon: 'success',
          title: '课程编辑成功',
          text: '课程信息已成功更新',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
      } else {
        // 创建课程
        await request('/user/courses', {
          method: 'POST',
          body: JSON.stringify(submitData),
        });
        Swal.fire({
          icon: 'success',
          title: '课程添加成功',
          text: '课程已成功创建',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
      }
      form.resetFields();
      setCoverUrl('');
      setCoursewareList([]);
      // 重置Upload组件
      if (uploadRef.current) {
        uploadRef.current.fileList = [];
      }
      onClose();
      
      // 调用成功回调函数
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: editingCourse ? '课程编辑失败' : '课程添加失败',
        text: '请稍后重试',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        position: 'top-end',
        toast: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingCourse ? '编辑课程' : '添加课程'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* 添加封面上传 */}
        <Form.Item
          label="课程封面"
          required
          help="建议尺寸: 800x450px，支持jpg、png格式"
        >
          <Upload
            ref={uploadRef}
            action="/api/common/upload"
            listType="picture-card"
            maxCount={1}
            accept=".jpg,.jpeg,.png"
            onChange={(info) => {
              console.log(info);
              if (info.file.status === 'done') {
                Swal.fire({
                  icon: 'success',
                  title: '上传成功',
                  text: `${info.file.name} 已成功上传`,
                  showConfirmButton: false,
                  timer: 3000,
                  timerProgressBar: true,
                  position: 'top-end',
                  toast: true
                });
             
                setCoverUrl(info.file.response.data.url);
              } else if (info.file.status === 'error') {
                Swal.fire({
                  icon: 'error',
                  title: '上传失败',
                  text: `${info.file.name} 上传失败，请重试`,
                  showConfirmButton: false,
                  timer: 3000,
                  timerProgressBar: true,
                  position: 'top-end',
                  toast: true
                });
              }
            }}
            onRemove={() => {
              setCoverUrl('');
              return true;
            }}
          >
           
              <div className="flex flex-col items-center justify-center">
                <ImageIcon className="w-6 h-6 mb-2" />
                <div>点击上传</div>
              </div>
          
          </Upload>

        </Form.Item>

        <Form.Item
          name="title"
          label="课程标题"
          rules={[{ required: true, message: '请输入课程标题' }]}
        >
          <Input placeholder="请输入课程标题" />
        </Form.Item>

        <Form.Item
          name="instructor"
          label="讲师"
          rules={[{ required: true, message: '请输入讲师姓名' }]}
        >
          <Input placeholder="请输入讲师姓名" />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="课程分类"
          rules={[{ required: true, message: '请选择课程分类' }]}
        >
          <Select
            placeholder="请选择课程分类"
            loading={optionsLoading}
            options={categories.map(cat => ({
              label: cat.name,
              value: cat.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="directionId"
          label="课程方向"
          rules={[{ required: true, message: '请选择课程方向' }]}
        >
          <Select
            placeholder="请选择课程方向"
            loading={optionsLoading}
            options={directions.map(dir => ({
              label: dir.name,
              value: dir.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="level"
          label="课程难度"
          rules={[{ required: true, message: '请选择课程难度' }]}
        >
          <Select
            placeholder="请选择课程难度"
            options={[
              { label: '入门', value: 'BEGINNER' },
              { label: '初级', value: 'ELEMENTARY' },
              { label: '中级', value: 'INTERMEDIATE' },
              { label: '高级', value: 'ADVANCED' },
              { label: '专家', value: 'EXPERT' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="课程描述"
          rules={[{ required: true, message: '请输入课程描述' }]}
        >
          <Input.TextArea rows={4} placeholder="请输入课程描述" />
        </Form.Item>

        <Form.Item
          name="targetAudience"
          label="适合人群"
          rules={[{ required: true, message: '请输入适合人群' }]}
        >
          <Input.TextArea rows={2} placeholder="请输入适合人群，例如：零基础学习者、有一定编程基础的开发者等" />
        </Form.Item>

        <Form.Item
          name="courseGoals"
          label="课程目标"
          rules={[{ required: true, message: '请输入课程目标' }]}
        >
          <Input.TextArea rows={2} placeholder="请输入学完本课程可以达到的目标" />
        </Form.Item>

        <Form.Item
          name="oneTimePayment"
          valuePropName="checked"
          initialValue={false}
        >
          <Checkbox
            onChange={(e) => {
              setOneTimePayment(e.target.checked);
              if (!e.target.checked) {
                setIsFree(false);
                form.setFieldValue('oneTimePoint', 0);
              } else {
                // 当勾选一次性支付时，触发验证
                setTimeout(() => {
                  form.validateFields(['oneTimePoint']);
                }, 100);
              }
            }}
          >
            一次性支付课程
            <div className="text-sm text-gray-500 mt-1">
              勾选后，用户必须一次性购买整个课程，无需按章节付费
            </div>
          </Checkbox>
        </Form.Item>

        {oneTimePayment && (
          <div>
            <Form.Item
              name="oneTimePoint"
              label="总积分"
              rules={[
                { required: true, message: '请输入总积分' },
                {
                  validator: (_, value) => {
                    if (value === undefined || value === null || value === '') {
                      return Promise.reject(new Error('请输入总积分'));
                    }
                    const numValue = Number(value);
                    if (isNaN(numValue) || numValue < 0) {
                      return Promise.reject(new Error('积分必须大于等于0'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              validateTrigger={['onChange', 'onBlur']}
            >
              <Input
                type="number"
                min={0}
                placeholder="请输入总积分"
                disabled={isFree}
                style={{ width: 200 }}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  console.log(value,'valuew')
                  if (value < 0) {
                    // 直接设置表单值
                    form.setFieldsValue({ oneTimePoint: 0 });
                  }
                  // 触发验证以确保状态同步
                  setTimeout(() => {
                    form.validateFields(['oneTimePoint']);
                  }, 0);
                }}
              />
            </Form.Item>
            <Form.Item>
              <Checkbox
                checked={isFree}
                onChange={(e) => {
                  setIsFree(e.target.checked);
                  if (e.target.checked) {
                    // 使用setFieldsValue而不是setFieldValue
                    form.setFieldsValue({ oneTimePoint: 0 });
                    // 延迟触发验证，确保值已更新
                    setTimeout(() => {
                      form.validateFields(['oneTimePoint']);
                    }, 0);
                  } else {
                    // 取消免费时也触发验证
                    setTimeout(() => {
                      form.validateFields(['oneTimePoint']);
                    }, 0);
                  }
                }}
              >
                是否免费
              </Checkbox>
            </Form.Item>
          </div>
        )}

        {/* 课件管理 */}
        <Form.Item label="课程课件">
          <Space direction="vertical" style={{ width: '100%' }}>
            {coursewareList.map((item, index) => (
              <Card
                key={index}
                title={`课件 ${index + 1}`}
                extra={
                  <Popconfirm
                    title="确定删除此课件吗？"
                    onConfirm={() => handleRemoveCourseware(index)}
                    okText="是"
                    cancelText="否"
                  >
                    <Trash2 className="text-red-500 cursor-pointer" />
                  </Popconfirm>
                }
                style={{ marginBottom: '10px' }}
              >
                <Form.Item
                  label="课件名称"
                  rules={[{ required: true, message: '请输入课件名称' }]}
                >
                  <Input
                    placeholder="课件名称"
                    value={item.name}
                    onChange={(e) => handleCoursewareChange(index, 'name', e.target.value)}
                  />
                </Form.Item>
                <Form.Item
                  label="课件文件地址信息"
                  rules={[{ required: true, message: '请输入课件文件链接' }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="请输入课件文件链接，如：百度网盘链接、阿里云盘链接等"
                    value={item.url}
                    onChange={(e) => handleCoursewareChange(index, 'url', e.target.value)}
                  />
                </Form.Item>
              </Card>
            ))}
            <Button
              type="dashed"
              onClick={handleAddCourseware}
              block
              icon={<Plus />}
            >
              添加课件
            </Button>
          </Space>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {editingCourse ? '保存' : '提交'}
            </Button>
            <Button onClick={onClose}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
} 