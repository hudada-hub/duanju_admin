'use client';
import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Upload, message, Popconfirm, Select, Switch, Space, Tooltip } from 'antd';
import { PlusOutlined, UploadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import Image from 'next/image';
import { request, getToken } from '@/utils/request';
import AdminLayout from '../components/layout/AdminLayout';
import dynamic from 'next/dynamic';

// 动态导入 WangEditor 组件
const WangEditor = dynamic(() => import('@/components/WangEditor'), {
  ssr: false // 禁用服务器端渲染
});

// 配置类型枚举
enum ConfigType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  IMAGE = 'IMAGE',
  MULTI_IMAGE = 'MULTI_IMAGE',
  MULTI_TEXT = 'MULTI_TEXT',
  MULTI_CONTENT = 'MULTI_CONTENT',
  RICH_TEXT = 'RICH_TEXT'  // 新增富文本类型
}

// 配置接口
interface Config {
  id: number;
  title: string;
  key: string;
  type: ConfigType;
  description?: string;
  sort: number;
  isEnabled: boolean;
  value: any;
}

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [itemsFileList, setItemsFileList] = useState<Record<number, UploadFile[]>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [configType, setConfigType] = useState<ConfigType>(ConfigType.TEXT);
  const [editorContent, setEditorContent] = useState('');

  // 获取配置列表
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await request<Config[]>('/configs');
      if (response.code === 0) {
        setConfigs(response.data || []);
      }
    } catch (error) {
      message.error('获取配置列表失败');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchConfigs();
  }, []);
  // 处理状态切换
  const handleStatusToggle = async (id: number, isEnabled: boolean) => {
    try {
      const response = await request(`/configs/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled })
      });
      
      if (response.code === 0) {
        message.success('状态更新成功');
        fetchConfigs();
      }
    } catch (error) {
      message.error('状态更新失败');
    }
  };
  // 表格列定义
  // 修改 columns 定义
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Config) => (
        <Space>
          {text}
          {record.description && (
            <Tooltip title={record.description}>
              <QuestionCircleOutlined />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '键名',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: ConfigType) => {
        const typeMap: Record<ConfigType, string> = {
          [ConfigType.TEXT]: '单行文本',
          [ConfigType.TEXTAREA]: '多行文本',
          [ConfigType.IMAGE]: '单图',
          [ConfigType.MULTI_IMAGE]: '多图',
          [ConfigType.MULTI_TEXT]: '多文本',
          [ConfigType.MULTI_CONTENT]: '多文本图片',
          [ConfigType.RICH_TEXT]: '富文本'
        };
        return typeMap[type];
      },
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
      sorter: (a: Config, b: Config) => a.sort - b.sort,
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      render: (isEnabled: boolean, record: Config) => (
        <Switch
          checked={isEnabled}
          onChange={(checked) => handleStatusToggle(record.id, checked)}
        />
      ),
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (value: any, record: Config) => {
        if (record.type === ConfigType.RICH_TEXT) {
          return <div className="max-w-md" dangerouslySetInnerHTML={{ __html: value || '' }} />;
        } else if (record.type === ConfigType.IMAGE) {
          return value ? (
            <Image 
              src={value} 
              alt={record.title} 
              width={80} 
              height={80} 
              style={{ height: 'auto' }}
              className="object-cover rounded"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400">
              暂无图片
            </div>
          );
        } else if (record.type === ConfigType.MULTI_IMAGE) {
          const images = value ? JSON.parse(value) : [];
          return (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img: string, index: number) => (
                <Image
                  key={index}
                  src={img}
                  alt={`${record.title}-${index}`}
                  width={80}
                  height={80}
                  style={{ height: 'auto' }}
                  className="object-cover rounded"
                />
              ))}
            </div>
          );
        } else if ([ConfigType.MULTI_TEXT, ConfigType.MULTI_CONTENT].includes(record.type)) {
          const items = value ? JSON.parse(value) : [];
          return `${items.length} 项内容`;
        }
        return value?.length > 50 ? value.substring(0, 50) + '...' : value;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Config) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该配置吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  // 处理编辑
  const handleEdit = (record: Config) => {
    setEditingId(record.id);
    setConfigType(record.type);
    
    if (record.type === ConfigType.RICH_TEXT) {
      setEditorContent(record.value || '');
      form.setFieldsValue({
        ...record,
        value: record.value || ''
      });
    } else if ([ConfigType.MULTI_TEXT, ConfigType.MULTI_CONTENT].includes(record.type)) {
      const items = JSON.parse(record.value || '[]');
      form.setFieldsValue({
        ...record,
        items: items.map((item: any) => ({
          title: item.title,
          content: item.content,
          url: item.imageUrl,
          link: item.link
        }))
      });
    } else if (record.type === ConfigType.MULTI_IMAGE) {
      form.setFieldsValue(record);
      const formattedFileList = JSON.parse(record.value || '[]').map((url: string, index: number) => ({
        uid: `-${index}`,
        name: `image-${index}`,
        status: 'done',
        url: url,
      }));
      setFileList(formattedFileList);
    } else if (record.type === ConfigType.IMAGE) {
      form.setFieldsValue(record);
      if (record.value) {
        setFileList([{
          uid: '-1',
          name: 'image',
          status: 'done',
          url: record.value,
        }]);
      }
    } else {
      form.setFieldsValue(record);
    }
    setModalVisible(true);
  };
  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      const response = await request(`/configs/${id}`, {
        method: 'DELETE'
      });
      
      if (response.code === 0) {
        message.success('删除成功');
        fetchConfigs();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };
  // 处理表单提交
  // 修改表单部分
  
  // 修改提交处理
  const handleSubmit = async (values: any) => {
    try {
      let submitValue = values.value;

      if (configType === ConfigType.RICH_TEXT) {
        submitValue = editorContent;
      } else if ([ConfigType.MULTI_TEXT, ConfigType.MULTI_CONTENT].includes(configType)) {
        submitValue = JSON.stringify(values.items || []);
      } else if (configType === ConfigType.IMAGE) {
        if (fileList.length === 0) {
          message.error('请上传图片');
          return;
        }
        submitValue = fileList[0]?.response?.url || fileList[0]?.url;
      } else if (configType === ConfigType.MULTI_IMAGE) {
        if (fileList.length === 0) {
          message.error('请上传至少一张图片');
          return;
        }
        submitValue = JSON.stringify(fileList.map(file => file.response?.url || file.url));
      }

      const submitData = {
        ...values,
        type: configType,
        value: submitValue,
        sort: values.sort || 0,
      };

      const response = await request(editingId ? `/configs/${editingId}` : '/configs', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(submitData),
      });

      if (response.code === 0) {
        message.success(editingId ? '更新成功' : '添加成功');
        setModalVisible(false);
        form.resetFields();
        setFileList([]);
        setEditingId(null);
        setConfigType(ConfigType.TEXT);
        setEditorContent('');
        fetchConfigs();
      }
    } catch (error) {
      message.error('操作失败');
    }
  };
  return (
    <AdminLayout>
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">配置管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingId(null);
            form.resetFields();
            setFileList([]);
            setConfigType(ConfigType.TEXT);
            setModalVisible(true);
            setEditorContent('');
          }}
        >
          添加配置
        </Button>
      </div>
  
      <Table
        columns={columns}
        dataSource={configs}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
  
      <Modal
        title={editingId ? '编辑配置' : '添加配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingId(null);
          form.resetFields();
          setFileList([]);
          setConfigType(ConfigType.TEXT);
          setEditorContent('');
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ sort: 0, isEnabled: true }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
  
          <Form.Item
            name="key"
            label={
              <Space>
                键名
                <Tooltip title="键名用于程序调用，添加后请勿随意修改">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            rules={[
              { required: true, message: '请输入键名' },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '键名只能包含字母、数字和下划线，且必须以字母开头' }
            ]}
          >
            <Input placeholder="请输入键名" disabled={!!editingId} />
          </Form.Item>
  
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={2} placeholder="请输入配置描述" />
          </Form.Item>
  
          <Form.Item
            label="类型"
            required
          >
            <Select
              value={configType}
              onChange={(value: ConfigType) => {
                setConfigType(value);
                form.setFieldValue('value', '');
                setFileList([]);
                setEditorContent('');
              }}
              disabled={!!editingId}
            >
              <Select.Option value={ConfigType.TEXT}>单行文本</Select.Option>
              <Select.Option value={ConfigType.TEXTAREA}>多行文本</Select.Option>
              <Select.Option value={ConfigType.IMAGE}>单图</Select.Option>
              <Select.Option value={ConfigType.MULTI_IMAGE}>多图</Select.Option>
              <Select.Option value={ConfigType.MULTI_TEXT}>多文本</Select.Option>
              <Select.Option value={ConfigType.MULTI_CONTENT}>多文本图片</Select.Option>
              <Select.Option value={ConfigType.RICH_TEXT}>富文本</Select.Option>
            </Select>
          </Form.Item>
  
          <Form.Item
            name="sort"
            label="排序"
            tooltip="数字越小越靠前"
          >
            <Input type="number" placeholder="请输入排序值" />
          </Form.Item>
  
          <Form.Item
            name="isEnabled"
            label="状态"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
  
          {configType === ConfigType.RICH_TEXT ? (
            <Form.Item
              label="内容"
              required
            >
              <WangEditor
                value={editorContent}
                onChange={setEditorContent}
                height={300}
                maxImageSize={5 * 1024 * 1024} // 5MB
                maxVideoSize={50 * 1024 * 1024} // 50MB
                maxImageNumber={10}
                maxVideoNumber={2}
              />
            </Form.Item>
          ) : (
            <>
              {[ConfigType.MULTI_TEXT, ConfigType.MULTI_CONTENT].includes(configType) ? (
                <Form.List name="items">
                  {(fields, { add, remove }) => (
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.key} className="border p-4 rounded">
                          <div className="flex justify-between mb-2">
                            <div className="text-lg">项目 {index + 1}</div>
                            <Button type="link" danger onClick={() => remove(field.name)}>删除</Button>
                          </div>
                          <Form.Item
                            {...field}
                            label="标题"
                            name={[field.name, 'title']}
                            rules={[{ required: true, message: '请输入标题' }]}
                          >
                            <Input placeholder="请输入标题" />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            label="内容"
                            name={[field.name, 'content']}
                            rules={[{ required: true, message: '请输入内容' }]}
                          >
                            <Input.TextArea rows={3} placeholder="请输入内容" />
                          </Form.Item>
                          {configType === ConfigType.MULTI_CONTENT && (
                            <Form.Item
                              {...field}
                              label="图片"
                              name={[field.name, 'url']}
                              rules={[{ required: true, message: '请上传图片' }]}
                            >
                              <div className="flex items-start gap-4">
                                <Upload
                                  action="/api/upload/media"
                                  listType="picture-card"
                                  maxCount={1}
                                  headers={{
                                    Authorization: `Bearer ${getToken()}`
                                  }}
                                  fileList={itemsFileList[field.name] || []}
                                  onChange={({ fileList, file }) => {
                                    // 处理上传错误
                                    if (file.status === 'error') {
                                      message.error('上传失败：' + (file.response?.message || '未知错误'));
                                      return;
                                    }
                                    setItemsFileList(prev => ({
                                      ...prev,
                                      [field.name]: fileList
                                    }));
                                    const url = fileList[0]?.response?.data?.url || fileList[0]?.url;
                                    form.setFieldValue(['items', field.name, 'url'], url);
                                  }}
                                >
                                  {(!itemsFileList[field.name] || itemsFileList[field.name].length === 0) && <UploadOutlined />}
                                </Upload>
                                {/* 图片预览 */}
                                <div className="flex-1">
                                  <div className="text-sm text-gray-500 mb-2">图片预览：</div>
                                  {form.getFieldValue(['items', field.name, 'url']) ? (
                                    <Image
                                      src={form.getFieldValue(['items', field.name, 'url'])}
                                      alt="预览图片"
                                      width={100}
                                      height={100}
                                      style={{ height: 'auto' }}
                                      className="object-cover rounded border"
                                    />
                                  ) : (
                                    <div className="w-25 h-25 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-sm">
                                      暂无图片
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Form.Item>
                          )}
                          <Form.Item
                            {...field}
                            label="链接"
                            name={[field.name, 'link']}
                          >
                            <Input placeholder="请输入链接地址" />
                          </Form.Item>
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add()} block>
                        添加项目
                      </Button>
                    </div>
                  )}
                </Form.List>
              ) : (
                <>
                  {[ConfigType.TEXT, ConfigType.TEXTAREA].includes(configType) ? (
                    <Form.Item
                      name="value"
                      label="值"
                      rules={[{ required: true, message: '请输入值' }]}
                    >
                      <Input.TextArea 
                        rows={configType === ConfigType.TEXTAREA ? 4 : 1} 
                        placeholder="请输入值" 
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      label="图片"
                      required
                    >
                      <Upload
                        action="/api/upload/media"
                        listType="picture-card"
                        headers={{
                          Authorization: `Bearer ${getToken()}`
                        }}
                        fileList={fileList}
                        onChange={({ fileList, file }) => {
                          // 处理上传错误
                          if (file.status === 'error') {
                            message.error('上传失败：' + (file.response?.message || '未知错误'));
                            return;
                          }
                          setFileList(fileList.map(file => ({
                            ...file,
                            url: file.response?.data?.url || file.url
                          })));
                        }}
                        maxCount={configType === ConfigType.MULTI_IMAGE ? 10 : 1}
                        accept="image/*"
                        multiple={configType === ConfigType.MULTI_IMAGE}
                      >
                        {(configType === ConfigType.IMAGE && fileList.length >= 1) || 
                         (configType === ConfigType.MULTI_IMAGE && fileList.length >= 10) ? null : 
                         <UploadOutlined />}
                      </Upload>
                    </Form.Item>
                  )}
                </>
              )}
            </>
          )}
  
          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </AdminLayout>
  );
}