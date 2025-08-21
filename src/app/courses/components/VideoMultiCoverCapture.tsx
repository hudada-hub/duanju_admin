import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';

export interface MultiCover {
  blob: Blob;
  dataUrl: string;
  time: number;
  cosUrl?: string;
}

export interface VideoMultiCoverCaptureProps {
  videoUrl: string;
  count?: number; // 抓取帧数，默认5
  onCovers: (covers: MultiCover[], duration: number) => void;
  width?: number;
  height?: number;
}

/**
 * 多帧抓取组件：用于上传后批量抓取视频帧
 */
const VideoMultiCoverCapture = forwardRef<any, VideoMultiCoverCaptureProps>(
  ({ videoUrl, count = 5, onCovers, width, height }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [duration, setDuration] = useState<number | null>(null);

    // 抓取多帧
    const handleCapture = async () => {
      return new Promise<MultiCover[]>((resolve, reject) => {
        const video = videoRef.current;
        if (!video) return reject('video ref not ready');
        video.onloadedmetadata = () => {
          const dur = video.duration;
          setDuration(dur);
          const points: number[] = [];
          for (let i = 0; i < count; i++) {
            // 均匀分布，避开0和结尾
            points.push(Math.max(0.1, Math.random() * (dur - 0.2)));
          }
          points.sort((a, b) => a - b);
          let covers: MultiCover[] = [];
          let idx = 0;

          const seekAndCapture = () => {
            if (idx >= points.length) {
              onCovers(covers, dur);
              resolve(covers);
              return;
            }
            video.currentTime = points[idx];
            video.onseeked = () => {
              const w = width || video.videoWidth;
              const h = height || video.videoHeight;
              const canvas = canvasRef.current;
              if (!canvas) return reject('canvas ref not ready');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject('canvas ctx error');
              ctx.drawImage(video, 0, 0, w, h);
              canvas.toBlob((blob) => {
                if (blob) {
                  covers.push({ blob, dataUrl: canvas.toDataURL('image/jpeg'), time: points[idx] });
                  idx++;
                  seekAndCapture();
                } else {
                  reject('toBlob failed');
                }
              }, 'image/jpeg', 0.92);
            };
          };
          seekAndCapture();
        };
        video.onerror = () => reject('视频加载失败');
        video.load();
      });
    };

    useImperativeHandle(ref, () => ({ handleCapture }), [videoUrl, count]);

    return (
      <div style={{ display: 'none' }}>
        <video ref={videoRef} src={videoUrl} crossOrigin="anonymous" preload="auto" />
        <canvas ref={canvasRef} />
      </div>
    );
  }
);

export default VideoMultiCoverCapture;
