import { Upload, UploadProps } from 'antd';
import { getToken } from '@/utils/request';
import { UploadOutlined } from '@ant-design/icons';
import { Button } from './button';
import { useState, useEffect } from 'react';

interface FileUploadProps extends Omit<UploadProps, 'onChange'> {
  // 文件上传成功后的回调
  onUploadSuccess?: (url: string) => void;
  // 上传按钮文字
  buttonText?: string;
  // 是否显示上传按钮
  showUploadButton?: boolean;
  // 上传接口地址
  uploadUrl?: string;
  // 当前值（用于编辑时显示已有图片）
  value?: string;
}

/**
 * 通用文件上传组件
 */
export function FileUpload({
  onUploadSuccess,
  buttonText = '上传文件',
  showUploadButton = true,
  uploadUrl = '/api/common/upload',
  value,
  ...props
}: FileUploadProps) {
  const [fileList, setFileList] = useState<any[]>([]);

  // 当value变化时，更新fileList
  useEffect(() => {
    if (value) {
      setFileList([{
        uid: '-1',
        name: 'image.jpg',
        status: 'done',
        url: value,
      }]);
    } else {
      setFileList([]);
    }
  }, [value]);

  // 默认的上传配置
  const defaultUploadProps: UploadProps = {
    name: 'file',
    listType: "picture-card",
    action: uploadUrl,
    maxCount: 1,
    fileList: fileList,
    headers: {
      Authorization: `Bearer ${getToken()}`
    },
    onChange: ({ file, fileList: newFileList }) => {
      console.log('FileUpload onChange:', file);
      setFileList(newFileList);
      
      // 处理各种上传状态
      switch (file.status) {
        case 'uploading':
          // 上传中状态，antd会自动显示进度条
          console.log('文件上传中...', file.percent);
          break;
          
        case 'done':
          // 上传成功
          const url = file.response?.data?.url || file.response?.url;
          console.log('上传成功，URL:', url);
          if (url) {
            onUploadSuccess?.(url);
          } else {
            console.error('上传成功但未获取到URL');
            onUploadSuccess?.('');
          }
          break;
          
        case 'error':
          // 上传失败
          console.error('上传失败:', file.error);
          onUploadSuccess?.('');
          break;
          
        case 'removed':
          // 文件被移除
          console.log('文件被移除');
          onUploadSuccess?.('');
          break;
          
        default:
          console.log('未知的上传状态:', file.status);
          break;
      }
    },
    onRemove: () => {
      setFileList([]);
      onUploadSuccess?.('');
      return true;
    },
    beforeUpload: (file) => {
      // 上传前的验证
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        console.error('文件类型错误:', file.type);
        return false;
      }
      
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        console.error('文件过大:', file.size);
        return false;
      }
      
      return true;
    },
    ...props
  };

  return (
    <Upload {...defaultUploadProps}>
      {fileList.length === 0 && showUploadButton && (
        <Button >
         <UploadOutlined /> {buttonText}
        </Button>
      )}
    </Upload>
  );
} 