'use client';

import React, { useState, useEffect, useRef, forwardRef, useCallback } from 'react';


interface CosVideoWithProgressProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  path: string;
  courseId: number;
  chapterId: number;
  userId: number;
  onProgressUpdate?: (progress: number) => void;
  initialProgress?: number;
}

export const CosVideoWithProgress = forwardRef<HTMLVideoElement, CosVideoWithProgressProps>(
  ({ path, courseId, chapterId, userId, onProgressUpdate, initialProgress = 0, ...props }, ref) => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
  
    const progressUpdateTimer = useRef<NodeJS.Timeout | null>(null);

    // 获取签名URL
    const refreshUrl = async () => {
      try {
        const response = await fetch('/api/common/upload/refresh-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        const data = await response.json();
        if (data.code === 0) {
          setUrl(data.data.url);
          setError(null);
        } else {
          setError(data.message || '获取视频URL失败');
        }
      } catch (err) {
        setError('获取视频URL失败');
      } finally {
        setLoading(false);
      }
    };

  
    // 处理视频播放事件
    

   

    // 设置初始进度
    useEffect(() => {
      const video = videoRef.current;
      if (video && initialProgress > 0) {
        // 根据进度设置播放位置
        video.addEventListener('loadedmetadata', () => {
          if (video.duration > 0) {
            video.currentTime = (initialProgress / 100) * video.duration;
          }
        }, { once: true });
      }
    }, [initialProgress]);

    useEffect(() => {
      refreshUrl();
      const timer = setInterval(refreshUrl, 60 * 60 * 1000);
      return () => clearInterval(timer);
    }, [path]);

    // 清理定时器
    useEffect(() => {
      return () => {
        if (progressUpdateTimer.current) {
          clearTimeout(progressUpdateTimer.current);
        }
      };
    }, []);


    

    if (loading) return <div className="text-gray-500">加载中...</div>;
    if (error) return <div className="text-red-500">加载失败: {error}</div>;

 
    return (
      <div
        ref={containerRef}
        className="player-container"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#000',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <video
          ref={ref || videoRef}
          id="videoPlayer"
          className="w-full h-full rounded-lg"
          src={url}
          {...props}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          controls
        />
      
   
      </div>
    );
  }
);

CosVideoWithProgress.displayName = 'CosVideoWithProgress'; 