import { Upload, UploadProps } from 'antd';
import { getToken } from '@/utils/request';
import { UploadOutlined } from '@ant-design/icons';
import { Button } from './button';

interface FileUploadProps extends Omit<UploadProps, 'onChange'> {
  // 文件上传成功后的回调
  onUploadSuccess?: (url: string) => void;
  // 上传按钮文字
  buttonText?: string;
  // 是否显示上传按钮
  showUploadButton?: boolean;
  // 上传接口地址
  uploadUrl?: string;
}

/**
 * 通用文件上传组件
 */
export function FileUpload({
  onUploadSuccess,
  buttonText = '上传文件',
  showUploadButton = true,
  uploadUrl = '/api/common/upload',
  ...props
}: FileUploadProps) {
  // 默认的上传配置
  const defaultUploadProps: UploadProps = {
    name: 'file',
    listType:"picture-card",
    action: uploadUrl,
    maxCount: 1,
    headers: {
      Authorization: `Bearer ${getToken()}`
    },
    onChange: ({ file }) => {
        console.log(file,'444');
      if (file.status === 'done') {
        // 上传成功，返回文件URL
        const url = file.response?.url;
        console.log(url,'333');
        onUploadSuccess?.(url);
      }
    },
    ...props
  };

  return (
    <Upload {...defaultUploadProps}>
      {showUploadButton && (
        <Button >
         <UploadOutlined /> {buttonText}
        </Button>
      )}
    </Upload>
  );
} 