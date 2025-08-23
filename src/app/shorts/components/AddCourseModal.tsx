'use client';
import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Upload, Select, Checkbox, Card, Popconfirm } from 'antd';
import Swal from 'sweetalert2';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { request } from '@/utils/request';
import { useCourseOptions } from '../hooks/useCourseOptions';
import { ImageUpload } from '@/components/ui/ImageUpload';

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
  editingCourse?: any; // 编辑的短剧数据
  onSuccess?: () => void; // 操作成功后的回调函数
}



export default function AddCourseModal({ visible, onClose, editingCourse, onSuccess }: AddCourseModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  const { categories, directions, loading: optionsLoading } = useCourseOptions();
  
  // 当编辑的短剧数据变化时，设置表单数据
  useEffect(() => {
    console.log(editingCourse);
    if (editingCourse) {
      form.setFieldsValue({
        title: editingCourse.title,
        instructor: editingCourse.instructor,
        description: editingCourse.description,
        categoryId: editingCourse.categoryId,
        directionId: editingCourse.directionId,
        coverUrl: editingCourse.coverUrl,
        status: editingCourse.status ,
      });
      setCoverUrl(editingCourse.coverUrl);
      
      // 设置课件列表（已移除）
      // if (editingCourse.courseware && Array.isArray(editingCourse.courseware)) {
      //   setCoursewareList(editingCourse.courseware);
      // } else {
      //   setCoursewareList([]);
      // }
    } else {
      form.resetFields();
      setCoverUrl('');
     
      // 重置Upload组件
      // if (uploadRef.current) {
      //   uploadRef.current.fileList = [];
      // }
    }
  }, [editingCourse, form]);

  // 课件相关功能已移除
  // const handleAddCourseware = () => {
  //   setCoursewareList([...coursewareList, { name: '', url: '' }]);
  // };

  // const handleRemoveCourseware = (index: number) => {
  //   const newList = coursewareList.filter((_, i) => i !== index);
  //   setCoursewareList(newList);
  // };

  // const handleCoursewareChange = (index: number, field: 'name' | 'url', value: string) => {
  //   const newList = [...coursewareList];
  //   newList[index][field] = value;
  //   setCoursewareList(newList);
  // };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const submitData = {
        ...values,
        coverUrl,
        // 移除不存在的字段
        // courseware: validCourseware, // 已移除课件功能
        // oneTimePoint: parseInt(values.oneTimePoint) || 0, // 已移除一次性支付
      };
      
      if (editingCourse) {
        // 编辑短剧
        await request(`/shorts/${editingCourse.id}`, {
          method: 'PUT',
          body: JSON.stringify(submitData),
        });
        Swal.fire({
          icon: 'success',
          title: '短剧编辑成功',
          text: '短剧信息已成功更新',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
      } else {
        // 创建短剧
        await request('/shorts', {
          method: 'POST',
          body: JSON.stringify(submitData),
        });
        Swal.fire({
          icon: 'success',
          title: '短剧添加成功',
          text: '短剧已成功创建',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
      }
      form.resetFields();
      setCoverUrl('');
      // setCoursewareList([]); // 已移除课件功能
      // 重置Upload组件
      // if (uploadRef.current) {
      //   uploadRef.current.fileList = [];
      // }
      onClose();
      
      // 调用成功回调函数
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: editingCourse ? '短剧编辑失败' : '短剧添加失败',
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
      title={editingCourse ? '编辑短剧' : '添加短剧'}
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
          label="短剧封面"
          name="coverUrl"
          required
          help="建议尺寸: 800x450px，支持jpg、png格式"
          rules={[{ required: true, message: '请上传短剧封面' }]}
        >
          <ImageUpload
            value={coverUrl}
            onChange={(url) => {
              setCoverUrl(url);
              form.setFieldValue('coverUrl', url);
            }}
            width={128}
            height={80}
            placeholder="点击上传封面"
            required={true}
          />
        </Form.Item>

        <Form.Item
          name="title"
          label="短剧标题"
          rules={[{ required: true, message: '请输入短剧标题' }]}
        >
          <Input placeholder="请输入短剧标题" />
        </Form.Item>

        <Form.Item
          name="instructor"
          label="导演"
          rules={[{ required: true, message: '请输入导演姓名' }]}
        >
          <Input placeholder="请输入导演姓名" />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="短剧分类"
          rules={[{ required: true, message: '请选择短剧分类' }]}
        >
          <Select
            placeholder="请选择短剧分类"
            loading={optionsLoading}
            options={categories.map(cat => ({
              label: cat.name,
              value: cat.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="directionId"
          label="短剧方向"
          rules={[{ required: true, message: '请选择短剧方向' }]}
        >
          <Select
            placeholder="请选择短剧方向"
            loading={optionsLoading}
            options={directions.map(dir => ({
              label: dir.name,
              value: dir.id,
            }))}
          />
        </Form.Item>

      
        <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="ONGOING">连载中</Select.Option>
              <Select.Option value="COMPLETED">已完结</Select.Option>
            </Select>
          </Form.Item>
        <Form.Item
          name="description"
          label="短剧描述"
          rules={[{ required: true, message: '请输入短剧描述' }]}
        >
          <Input.TextArea rows={4} placeholder="请输入短剧描述" />
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