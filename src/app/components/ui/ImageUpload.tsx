'use client';

import { useState, useCallback } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Notification } from '@/utils/notification';

interface ImageUploadProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  multiple?: boolean;
  maxCount?: number;
  className?: string;
}

export default function ImageUpload({ 
  value = [], 
  onChange, 
  multiple = true, 
  maxCount = 5,
  className = '' 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  // 处理文件上传
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    // 检查文件数量限制
    if (value.length + files.length > maxCount) {
      Notification.error(`最多只能上传 ${maxCount} 张图片`);
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          Notification.error(`${file.name} 不是有效的图片文件`);
          continue;
        }

        // 检查文件大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          Notification.error(`${file.name} 文件大小超过 5MB`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        // 获取token
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/common/upload', {
          method: 'POST',
          body: formData,
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
            // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
          },
        });

        if (!response.ok) {
          throw new Error('上传失败');
        }

        const data = await response.json();
        
        if (data.code === 0 && data.data) {
          uploadedUrls.push(data.data.url);
        } else {
          Notification.error(`上传 ${file.name} 失败: ${data.message}`);
        }
      }

      if (uploadedUrls.length > 0) {
        const newUrls = multiple ? [...value, ...uploadedUrls] : uploadedUrls;
        onChange?.(newUrls);
        Notification.success(`成功上传 ${uploadedUrls.length} 张图片`);
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      Notification.error('上传图片失败');
    } finally {
      setUploading(false);
    }
  }, [value, onChange, multiple, maxCount]);

  // 删除图片
  const handleRemoveImage = useCallback((index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange?.(newUrls);
  }, [value, onChange]);

  // 处理拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className={className}>
      {/* 上传区域 */}
      <div
        className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors ${
          uploading ? 'opacity-50 pointer-events-none' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          multiple={multiple}
          accept="image/*"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id="image-upload"
          disabled={uploading}
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-2">
            <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
              {uploading ? '上传中...' : '点击上传图片'}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              支持拖拽上传，最多 {maxCount} 张图片
            </p>
          </div>
        </label>
      </div>

      {/* 已上传的图片 */}
      {value.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {value.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`上传图片 ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 