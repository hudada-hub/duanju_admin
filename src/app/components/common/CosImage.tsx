'use client';

import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import Image from 'next/image';

interface CosImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string;
  width: number;
  height: number;
}

/**
 * 获取图片组件
 * 这是一个客户端组件，用于自动刷新签名URL
 */
export const CosImage: FC<CosImageProps> = ({ path, ...props }) => {
  const [url, setUrl] = useState('');

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
  //       setError(data.message || '获取图片URL失败');
  //     }
  //   } catch (err) {
  //     setError('获取图片URL失败');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // 组件加载时获取URL
  useEffect(() => {
    // 只有当 path 是有效的 HTTPS URL 时才处理
    setUrl(path);
      // setError('无效的图片路径');
  }, [path]);

  // if (loading) {
  //   return <div className="text-gray-500">加载中...</div>;
  // }

  // if (error || !url) {
  //   return <div className="text-red-500">加载失败: {error || '无效的图片路径'}</div>;
  // }

  // 从 props 中解构出 width 和 height，剩余的属性放入 restProps
  const { width, height, ...restProps } = props;
  if(!url){
    return <div className="text-red-500 bg-zinc-200 rounded-full w-[full] h-full"></div>;
  }
  return <Image src={url} width={width} height={height} alt={restProps.alt || ''} {...restProps} />;
}; 