'use client'
import React, { useRef, useState } from 'react';
import { Upload, Button } from 'antd';
import Swal from 'sweetalert2';
import { UploadOutlined } from '@ant-design/icons';

interface VideoUploadWithWatermarkProps {
  value?: string;
  onChange?: (url: string) => void;
  watermarkFile?: File; // 可选，图片水印
  uploadAction: string; // 上传接口地址
}

const VideoUploadWithWatermark: React.FC<VideoUploadWithWatermarkProps> = ({ value, onChange, watermarkFile, uploadAction }) => {
  const [uploading, setUploading] = useState(false);
  const messageRef = useRef<HTMLParagraphElement | null>(null);

  const uploadProps = {
    showUploadList: false,
    beforeUpload: async (file: File) => {
      setUploading(true);
      try {
        // 直接上传原始视频文件，不做水印处理
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch(uploadAction, {
          method: 'POST',
          body: formData,
        });
        const data = await resp.json();
        if (data.code === 0 && data.data?.url) {
          onChange?.(data.data.url);
          Swal.fire({
            icon: 'success',
            title: '上传成功',
            text: '视频已成功上传',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            position: 'top-end',
            toast: true
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: '上传失败',
            text: data.message || '请重试',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            position: 'top-end',
            toast: true
          });
        }
      } catch (e: any) {
        Swal.fire({
          icon: 'error',
          title: '处理失败',
          text: e.message || '请重试',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: 'top-end',
          toast: true
        });
      } finally {
        setUploading(false);
      }
      // 阻止 antd 自动上传
      return false;
    },
  };

  return (
    <div>
      <div ref={messageRef}></div>
      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />} loading={uploading} disabled={uploading}>
          {uploading ? '处理中...' : '上传视频'}
        </Button>
      </Upload>
      {value && (
        <div className="mt-4">
          <video src={value} controls className="w-full rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default VideoUploadWithWatermark; 