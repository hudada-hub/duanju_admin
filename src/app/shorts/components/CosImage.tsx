'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import Image from 'next/image';
import { AiOutlineClose } from 'react-icons/ai';

interface CosImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string;
  width: number;
  height: number;
  preview?: boolean; // 新增：是否支持预览
}

/**
 * 获取图片组件
 * 这是一个客户端组件，用于自动刷新签名URL
 */
export const CosImage: FC<CosImageProps> = ({ path, preview = false, ...props }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false); // 预览状态
  const hasInitialized = useRef(false); // 用于防止重复初始化

  // 获取签名URL - 使用 useCallback 避免重复创建
  // const refreshUrl = useCallback(async () => {
  //   try {
  //     let cleanPath = path;
  //     if(path.includes('?q-sign-algorithm=sha1')){
  //       cleanPath = path.split('?q-sign-algorithm=sha1')[0];
  //     }
      
  //     const response = await fetch('/api/common/upload/refresh-url', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ path: cleanPath }),
  //     });

  //     const data = await response.json();
  //     if (data.code === 0) {
  //       setUrl(data.data.url);
  //       setError(null);
  //     } else {
  //       setError(data.message || '获取图片URL失败');
  //     }
  //   } catch (err) {
  //     setError('获取图片URL失败');
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [path]);

  // 组件加载时获取URL
  useEffect(() => {
    if(!path) return;
    
    // 防止在严格模式下重复执行
    // if (hasInitialized.current) return;
    // hasInitialized.current = true;
    
    // if(path.startsWith('https://')){
    //   refreshUrl();
    // }

    // 每隔1小时刷新一次URL（避免URL过期）
    // const timer = setInterval(refreshUrl, 60 * 60 * 1000);
    // return () => {
    //   clearInterval(timer);
    //   hasInitialized.current = false; // 重置标志
    // };
    setUrl(path)
  }, [path]);

  // if (loading) {
  //   // 优化加载中骨架屏
  //   return (
  //     <div className="w-full h-full flex items-center justify-center bg-gray-100 animate-pulse rounded-lg">
  //       <div className="w-2/3 h-2/3 bg-gradient-to-tr from-gray-200 via-gray-100 to-gray-200 rounded-lg" />
  //     </div>
  //   );
  // }

  // if (error) {
  //   return <div className="text-red-500">加载失败: {error}</div>;
  // }

  // 从 props 中解构出 width 和 height，剩余的属性放入 restProps
  const { width, height, ...restProps } = props;

  // 预览模式
  if (preview) {
    return (
      <>
        <Image
          src={url}
          width={width}
          height={height}
          alt=""
          {...restProps}
          style={{ cursor: 'pointer', ...restProps.style }}
          onClick={() => setShowPreview(true)}
        />
        {showPreview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur"
            onClick={() => setShowPreview(false)}
          >
            <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <Image src={url} width={width * 2} height={height * 2} alt="预览" className="object-contain max-h-[90vh] max-w-[90vw]" />
              <button
                className="absolute top-2 right-2 text-white text-2xl bg-black/40 rounded-full p-1 hover:bg-black/70 transition-colors"
                onClick={() => setShowPreview(false)}
                aria-label="关闭预览"
              >
                <AiOutlineClose />
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return <Image src={url} width={width} height={height} alt="" {...restProps} />;
}; 