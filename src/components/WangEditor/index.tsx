'use client';

import { useState, useEffect } from 'react';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import '@wangeditor/editor/dist/css/style.css';

interface WangEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  height?: number;
  maxImageSize?: number;
  maxVideoSize?: number;
  maxImageNumber?: number;
  maxVideoNumber?: number;
  uploadUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export default function WangEditor({
  value = '',
  onChange,
  placeholder = '请输入内容...',
  height = 500,
  maxImageSize = 50 * 1024 * 1024, // 默认50MB
  maxVideoSize = 50 * 1024 * 1024, // 默认50MB
  maxImageNumber = 10,
  maxVideoNumber = 5,
  uploadUrl = '/api/upload/media',
  className = '',
  style = {},
  disabled = false,
}: WangEditorProps) {
  // 编辑器实例
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  // 编辑器内容
  const [html, setHtml] = useState<string>(value);

  // 组件销毁时销毁编辑器实例
  useEffect(() => {
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  // 同步外部传入的 value
  useEffect(() => {
    if (editor && value !== html) {
      setHtml(value);
      editor.setHtml(value);
    }
  }, [value]);

  // 获取 token
  const getToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
  };

  // 工具栏配置
  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: disabled ? ['uploadImage', 'uploadVideo', 'insertLink', 'editLink'] : [],
  };

  // 编辑器配置
  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
    readOnly: disabled,
    autoFocus: false,
    MENU_CONF: {
      uploadImage: {
        server: uploadUrl,
        fieldName: 'file',
        maxFileSize: maxImageSize,
        maxNumberOfFiles: maxImageNumber,
        allowedFileTypes: ['image/*'],
        meta: {},
        metaWithUrl: true,
        withCredentials: true,
        timeout: 30 * 1000,
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        customInsert(res: any, insertFn: any) {
          if (res.code === 0) {
            insertFn(res.data.location);
          } else if (res.code === 401) {
            // token 失效，可以在这里处理登录过期的情况
            window.location.href = '/login';
          } else {
            throw new Error(res.message || '上传失败');
          }
        },
        onFailed(file: File, res: any) {
          console.error(`${file.name} 上传失败:`, res);
          if (res.code === 401) {
            window.location.href = '/login';
          } else {
            throw new Error(res.message || '上传失败');
          }
        },
        onError(file: File, err: any) {
          console.error(`${file.name} 上传出错:`, err);
          throw err;
        },
      },
      uploadVideo: {
        server: uploadUrl,
        fieldName: 'file',
        maxFileSize: maxVideoSize,
        maxNumberOfFiles: maxVideoNumber,
        allowedFileTypes: ['video/*'],
        meta: {},
        metaWithUrl: true,
        withCredentials: true,
        timeout: 60 * 1000,
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        customInsert(res: any, insertFn: any) {
          if (res.code === 0) {
            insertFn(res.data.location);
          } else if (res.code === 401) {
            // token 失效，可以在这里处理登录过期的情况
            window.location.href = '/login';
          } else {
            throw new Error(res.message || '上传失败');
          }
        },
        onFailed(file: File, res: any) {
          console.error(`${file.name} 上传失败:`, res);
          if (res.code === 401) {
            window.location.href = '/login';
          } else {
            throw new Error(res.message || '上传失败');
          }
        },
        onError(file: File, err: any) {
          console.error(`${file.name} 上传出错:`, err);
          throw err;
        },
      },
    },
  };

  // 内容变化时的处理函数
  const handleChange = (editor: IDomEditor) => {
    const newHtml = editor.getHtml();
    setHtml(newHtml);
    onChange?.(newHtml);
  };

  return (
    <div className={`border rounded-md ${className}`} style={style}>
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        style={{ borderBottom: '1px solid #ccc' }}
      />
      <Editor
        defaultConfig={editorConfig}
        value={html}
        onCreated={setEditor}
        onChange={handleChange}
        mode="default"
        style={{ 
          height: `${height}px`,
          overflowY: 'hidden',
          ...(disabled ? { cursor: 'not-allowed', background: '#f5f5f5' } : {})
        }}
      />
    </div>
  );
} 