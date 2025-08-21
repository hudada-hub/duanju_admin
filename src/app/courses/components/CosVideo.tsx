'use client';

import React, { useState, useEffect, useRef, forwardRef } from 'react';

interface CosVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  path: string;
}

/**
 * 获取视频组件
 * 这是一个客户端组件，用于自动刷新签名URL
 * 支持画中画模式
 */
export const CosVideo = forwardRef<HTMLVideoElement, CosVideoProps>(({ path, ...props }, ref) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // // 获取签名URL
  // const refreshUrl = async () => {
  //   try {
  //     const response = await fetch('/api/common/upload/refresh-url', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ path }),
  //     });

  //     const data = await response.json();
  //     if (data.code === 0) {
  //       setUrl(data.data.url);
  //       setError(null);
  //     } else {
  //       setError(data.message || '获取视频URL失败');
  //     }
  //   } catch (err) {
  //     setError('获取视频URL失败');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // 组件加载时获取URL
  useEffect(() => {
    // refreshUrl();
    // // 每隔1小时刷新一次URL（避免URL过期）
    // const timer = setInterval(refreshUrl, 60 * 60 * 1000);
    // return () => clearInterval(timer);
    setUrl(path)
  }, [path]);

 


  if (error) {
    return <div className="text-red-500">加载失败: {error}</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        className="w-full h-full rounded-lg"
        src={url}
        {...props}
        // 支持画中画
        controls
        // onDoubleClick={async () => {
        //   const video = videoRef.current;
        //   if (!video) return;
        //   if (document.pictureInPictureEnabled) {
        //     try {
        //       if (document.pictureInPictureElement) {
        //         await document.exitPictureInPicture();
        //       } else {
        //         await video.requestPictureInPicture();
        //       }
        //     } catch (e) {
        //       // 忽略错误
        //     }
        //   }
        // }}
      >
        您的浏览器不支持 HTML5 视频播放
      </video>
    </div>
  );
}); 