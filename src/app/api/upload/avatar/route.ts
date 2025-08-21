import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { verifyAuth } from '@/utils/auth';
import { ResponseUtil, ResponseCode } from '@/utils/response';
import { v4 as uuidv4 } from 'uuid';
import OSS from 'ali-oss';

// 允许的图片类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// 最大文件大小（最大 2MB）
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

// 配置请求体大小限制
export const config = {
  api: {
    bodyParser: false,
  },
};

// 初始化阿里云 OSS 客户端
function getOSSClient() {
  return new OSS({
    region: process.env.OSS_REGION || '',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    secure: true,
    endpoint: 'oss-cn-beijing.aliyuncs.com',
  });
}

// 解析 multipart/form-data
async function parseMultipartFormData(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('avatar') as File | null;
  
  if (!file) {
    throw new Error('请选择要上传的头像');
  }

  return file;
}

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAuth(req);
    if (!authResult?.user) {
      return ResponseUtil.unauthorized('未登录');
    }

    // 解析上传的文件
    const file = await parseMultipartFormData(req);

    // 验证文件类型
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return ResponseUtil.error('只支持 JPG、PNG、GIF、WEBP 格式的图片');
    }

    // 验证文件大小
    if (file.size > MAX_AVATAR_SIZE) {
      return ResponseUtil.error(`头像大小不能超过 ${MAX_AVATAR_SIZE / 1024 / 1024}MB`);
    }

    // 生成新的文件名
    const ext = file.type.split('/')[1];
    const filename = `${authResult.user.id}_${Date.now()}.${ext}`;
    
    // 将文件内容转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 使用 sharp 处理图片
    const processedImage = await sharp(buffer)
      .resize(200, 200, { // 调整为头像合适的尺寸
        fit: 'cover',
        position: 'center'
      })
      .toBuffer();
    
    // 确定存储路径
    const ossPath = `uploads/avatars/${filename}`;
    
    // 上传到阿里云 OSS
    const client = getOSSClient();
    const result = await client.put(ossPath, processedImage, {
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
        'x-oss-storage-class': 'Standard',
        'x-oss-forbid-overwrite': 'false',
      },
    });

    // 构建 URL - 修复URL重复问题
    let fileUrl = '';
    if (process.env.OSS_CDN_DOMAIN) {
      // 使用CDN域名
      const cdnDomain = process.env.OSS_CDN_DOMAIN.endsWith('/') 
        ? process.env.OSS_CDN_DOMAIN.slice(0, -1) 
        : process.env.OSS_CDN_DOMAIN;
      fileUrl = `${cdnDomain}/${ossPath}`;
    } else {
      // 直接使用OSS返回的URL
      fileUrl = result.url;
    }

    // 更新用户头像信息
    await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        avatar: fileUrl,
      }
    });

    // 返回文件信息
    return ResponseUtil.success({
      url: fileUrl,
      filename: filename,
      originalName: file.name,
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return ResponseUtil.error(`上传头像失败: ${errorMessage} `, ResponseCode.SERVER_ERROR);
  }
}

// 获取上传配置信息
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAuth(req);
    if (!authResult?.user) {
      return ResponseUtil.unauthorized('未登录');
    }

    return NextResponse.json(ResponseUtil.success({
      maxAvatarSize: MAX_AVATAR_SIZE,
      allowedImageTypes: ALLOWED_IMAGE_TYPES,
      uploadPath: '/api/upload/avatar'
    }));
  } catch (error) {
    console.error('获取头像上传配置失败:', error);
    return NextResponse.json(
      ResponseUtil.error('获取头像上传配置失败', ResponseCode.SERVER_ERROR),
      { status: 500 } 
    );
  }
}