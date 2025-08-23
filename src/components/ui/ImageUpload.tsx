import { Upload } from 'antd';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  width?: number;
  height?: number;
  placeholder?: string;
  required?: boolean;
}

/**
 * 简洁的图片上传组件
 */
export function ImageUpload({ 
  value, 
  onChange, 
  width = 128, 
  height = 80, 
  placeholder = "点击上传",
  required = false 
}: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(value || '');

  useEffect(() => {
    setImageUrl(value || '');
  }, [value]);

  const handleUploadSuccess = (url: string) => {
    setImageUrl(url);
    onChange?.(url);
  };

  const handleRemove = () => {
    setImageUrl('');
    onChange?.('');
  };

  return (
    <div className="space-y-3">
      {/* 当前图片显示 */}
      {imageUrl && (
        <div className="relative inline-block">
          <img 
            src={imageUrl} 
            alt="图片预览" 
            className="object-cover rounded border"
            style={{ width: `${width}px`, height: `${height}px` }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}
      
      {/* 上传按钮 */}
      {!imageUrl && (
        <Upload
          action="/api/common/upload"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          maxCount={1}
          showUploadList={false}
          onChange={(info) => {
            if (info.file.status === 'done') {
              const url = info.file.response?.data?.url || info.file.response?.url;
              if (url) {
                handleUploadSuccess(url);
                Swal.fire({
                  icon: 'success',
                  title: '上传成功',
                  showConfirmButton: false,
                  timer: 1500,
                  position: 'top-end',
                  toast: true
                });
              }
            } else if (info.file.status === 'error') {
              Swal.fire({
                icon: 'error',
                title: '上传失败',
                text: '请重试',
                showConfirmButton: false,
                timer: 2000,
                position: 'top-end',
                toast: true
              });
            }
          }}
        >
          <div 
            className="border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-400 cursor-pointer transition-colors"
            style={{ width: `${width}px`, height: `${height}px` }}
          >
            <div className="text-2xl mb-1">📷</div>
            <div className="text-xs">{placeholder}</div>
          </div>
        </Upload>
      )}
      
      {/* 必填提示 */}
      {required && !imageUrl && (
        <div className="text-red-500 text-xs">请上传图片</div>
      )}
    </div>
  );
} 