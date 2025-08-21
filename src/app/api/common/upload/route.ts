import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { verifyAuth } from '@/utils/auth';
import { ResponseUtil } from '@/utils/response';
import { v4 as uuidv4 } from 'uuid';
import COS from 'cos-nodejs-sdk-v5';
import { tencentCloudConfig } from '@/config/tencentcloud';

// 允许的图片类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// 允许的视频类型
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

// 允许的音频类型
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];

// 最大文件大小 (10MB)
const MAX_IMAGE_SIZE = 100 * 1024 * 1024;
const MAX_VIDEO_SIZE = 5000 * 1024 * 1024;
const MAX_AUDIO_SIZE = 100 * 1024 * 1024;

// 配置请求体大小限制
export const config = {
  api: {
    bodyParser: false,
  },
};

// 初始化腾讯云 COS 客户端
function getCOSClient() {
  const { cosConfig } = tencentCloudConfig;
  return new COS({
    SecretId: cosConfig.secretId,
    SecretKey: cosConfig.secretKey,
    Protocol: 'https:', // 使用 HTTPS
    FileParallelLimit: 3,    // 控制文件上传并发数
    ChunkParallelLimit: 8,   // 控制分片上传并发数
    ChunkSize: 1024 * 1024 * 8,    // 控制分片大小，单位 B，小于等于5GB
    Timeout: 60000,  // 请求超时时间，单位毫秒
  });
}

// 解析 multipart/form-data
async function parseMultipartFormData(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  
  if (!file) {
    throw new Error('请选择要上传的文件');
  }

  return file;
}

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    // const authResult = await verifyAuth(req);
    // if (!authResult?.user) {
    //   return ResponseUtil.unauthorized('未登录');
    // }

    // 解析上传的文件
    const file = await parseMultipartFormData(req);

    // 验证文件类型
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);
    
    if (!isImage && !isVideo && !isAudio) {
      return ResponseUtil.error('不支持的文件类型，请上传 JPG、PNG、GIF、WebP 格式的图片，MP4、WebM、OGG 格式的视频，或 MP3、WAV、OGG、M4A 格式的音频');
    }

    // 验证文件大小
    let maxSize = MAX_IMAGE_SIZE;
    if (isVideo) {
      maxSize = MAX_VIDEO_SIZE;
    } else if (isAudio) {
      maxSize = MAX_AUDIO_SIZE;
    }
    
    if (file.size > maxSize) {
      return ResponseUtil.error(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`);
    }

    // 生成新的文件名
    const ext = file.type.split('/')[1] || (isImage ? 'jpg' : isVideo ? 'mp4' : 'mp3');
    const filename = `${uuidv4()}.${ext}`;
    
    // 确定存储路径
    let fileType = 'images';
    if (isVideo) {
      fileType = 'videos';
    } else if (isAudio) {
      fileType = 'audios';
    }
    
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const cosPath = `uploads/${fileType}/${year}/${month}/${day}/${filename}`;

    // 将文件内容转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 上传到腾讯云 COS
    const cos = getCOSClient();
    const { cosConfig } = tencentCloudConfig;

    // 构建完整的存储桶名称和地域
    const bucketName = cosConfig.bucket;
    const bucketRegion = cosConfig.region;

    const result = await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: bucketName,
        Region: bucketRegion,
        Key: cosPath,
        Body: buffer,
        ContentType: file.type,
        ContentDisposition: `inline; filename="${encodeURIComponent(file.name)}"`,
        StorageClass: 'MAZ_STANDARD',
        CacheControl: 'max-age=31536000',
        ACL: 'public-read', // 设置公有读权限
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    // 获取临时访问URL
    const fileUrl = await new Promise<string>((resolve, reject) => {
      cos.getObjectUrl({
        Bucket: bucketName,
        Region: bucketRegion,
        Key: cosPath,
        Sign: false,
        // Expires: 7200, // 2小时有效期，仅用于预览
        Protocol: 'https:',
      }, (err, data) => {
        if (err) {
          reject(err);
    } else {
          resolve(data.Url);
    }
      });
    });

    // 返回文件信息
    return ResponseUtil.success({
      url: fileUrl, // 临时预览URL
      location: fileUrl, // 兼容 wangEditor
      filename: filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      // 存储相关信息，用于后续获取签名URL
      storage: {
        bucket: bucketName,
        region: bucketRegion,
        key: cosPath,
        path: cosPath // 用于数据库存储的路径
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return ResponseUtil.serverError(`文件上传失败: ${errorMessage} `);
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

    return ResponseUtil.success({
      maxImageSize: MAX_IMAGE_SIZE,
      maxVideoSize: MAX_VIDEO_SIZE,
      maxAudioSize: MAX_AUDIO_SIZE,
      allowedImageTypes: ALLOWED_IMAGE_TYPES,
      allowedVideoTypes: ALLOWED_VIDEO_TYPES,
      allowedAudioTypes: ALLOWED_AUDIO_TYPES,
      uploadPath: '/api/common/upload'
    });
  } catch (error) {
    console.error('获取上传配置失败:', error);
    return ResponseUtil.serverError('获取上传配置失败');
  } 
}
