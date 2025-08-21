'use client';

import React, { useState, useEffect, useRef, forwardRef } from 'react';

interface CosVideoWatermarkProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  path: string;
}

export const CosVideoWatermark = forwardRef<HTMLVideoElement, CosVideoWatermarkProps>(({ path, ...props }, ref) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    refreshUrl();
    const timer = setInterval(refreshUrl, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [path]);

  // 监听全屏事件
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;
  
    // 处理video原生全屏按钮
    function forceContainerFullscreen() {
      // 标准
      // if (document.fullscreenElement === video) {
      //   document.exitFullscreen();
      //   if (container.requestFullscreen) {
      //     container.requestFullscreen();
      //   }
      // }
      // webkit
      if ((document as any).webkitFullscreenElement === video) {
        (document as any).webkitExitFullscreen();
        if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        }
      }
      // firefox
      if ((document as any).mozFullScreenElement === video) {
        (document as any).mozCancelFullScreen();
        if ((container as any).mozRequestFullScreen) {
          (container as any).mozRequestFullScreen();
        }
      }
      // ms
      if ((document as any).msFullscreenElement === video) {
        (document as any).msExitFullscreen();
        if ((container as any).msRequestFullscreen) {
          (container as any).msRequestFullscreen();
        }
      }
    }
  
    video.addEventListener('fullscreenchange', forceContainerFullscreen);
    video.addEventListener('webkitfullscreenchange', forceContainerFullscreen);
    video.addEventListener('mozfullscreenchange', forceContainerFullscreen);
    video.addEventListener('MSFullscreenChange', forceContainerFullscreen);
  
    return () => {
      video.removeEventListener('fullscreenchange', forceContainerFullscreen);
      video.removeEventListener('webkitfullscreenchange', forceContainerFullscreen);
      video.removeEventListener('mozfullscreenchange', forceContainerFullscreen);
      video.removeEventListener('MSFullscreenChange', forceContainerFullscreen);
    };
  }, []);

  // 自定义全屏按钮
  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    const isFull =
      document.fullscreenElement === container ||
      (document as any).webkitFullscreenElement === container ||
      (document as any).mozFullScreenElement === container ||
      (document as any).msFullscreenElement === container;
    if (isFull) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    }
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;
  if (error) return <div className="text-red-500">加载失败: {error}</div>;

  // 隐藏video原生全屏按钮
  const hideFullscreenStyle = `
    video::-webkit-media-controls-fullscreen-button { display: none !important; }
    video::-webkit-media-controls-enclosure { overflow: hidden; }
  `;

  // 水印样式
  const watermarkStyle: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 100,
    color: isFullscreen ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
    fontSize: isFullscreen ? 20 : 24,
    fontWeight: 'bold',
    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
    opacity: isFullscreen ? 0.8 : 0.7,
    right: 16,
    top: 16,
    userSelect: 'none',
    transform: isFullscreen ? 'none' : 'rotate(-20deg)',
  };

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
      {/* 隐藏video原生全屏按钮的样式 */}
      <style>{hideFullscreenStyle}</style>
      <video
        ref={ref || videoRef}
        id="videoPlayer"
        className="w-full h-full rounded-lg"
        src={url}
        {...props}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        controls
      />
      {/* 自定义全屏按钮（可选） */}
      <button
        type="button"
        onClick={handleFullscreen}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 200,
          background: 'rgba(0,0,0,0.4)',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '6px 12px',
          cursor: 'pointer',
        }}
      >
        全屏
      </button>
      {/* 右上角水印 */}
      <div className="watermark" style={watermarkStyle}>
        不可外传
      </div>
    </div>
  );
});