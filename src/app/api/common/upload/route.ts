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

// 初始化腾讯云 COS 客户端
function getCOSClient() {
  const { cosConfig } = tencentCloudConfig;
  return new COS({
    SecretId: cosConfig.secretId,
    SecretKey: cosConfig.secretKey,
    Protocol: 'https:', // 使用 HTTPS
    FileParallelLimit: 3,    // 控制文件上传并发数
    ChunkParallelLimit: 3,   // 减少分片上传并发数，提高兼容性
    ChunkSize: 1024 * 1024, // 减少分片大小到1MB，提高兼容性
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
    console.log('开始处理文件上传请求');
    
    // 验证用户身份
    // const authResult = await verifyAuth(req);
    // if (!authResult?.user) {
    //   return ResponseUtil.unauthorized('未登录');
    // }

    // 解析上传的文件
    console.log('开始解析multipart/form-data');
    const file = await parseMultipartFormData(req);
    console.log('文件解析成功:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // 验证文件类型
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);
    
    console.log('文件类型验证:', { isImage, isVideo, isAudio, fileType: file.type });
    
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
    
    console.log('文件大小验证:', { fileSize: file.size, maxSize, isValid: file.size <= maxSize });
    
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
    
    console.log('文件存储信息:', { filename, cosPath, fileType });

    // 将文件内容转换为 Buffer
    console.log('开始转换文件为Buffer');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('文件Buffer转换完成，大小:', buffer.length);
    
    // 检查COS配置
    const { cosConfig } = tencentCloudConfig;
    console.log('COS配置信息:', {
      bucket: cosConfig.bucket,
      region: cosConfig.region,
      hasSecretId: !!cosConfig.secretId,
      hasSecretKey: !!cosConfig.secretKey
    });

    // 如果COS配置不完整，使用临时URL（仅用于测试）
    if (!cosConfig.bucket || !cosConfig.region || !cosConfig.secretId || !cosConfig.secretKey) {
      console.log('COS配置不完整，使用临时URL');
      
      // 返回一个临时的URL，实际文件内容存储在内存中（仅用于测试）
      const tempUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;
      
      return ResponseUtil.success({
        url: tempUrl,
        location: tempUrl,
        filename: filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        storage: {
          bucket: 'temp',
          region: 'local',
          key: cosPath,
          path: cosPath
        },
        note: '这是临时URL，仅用于测试。请配置腾讯云COS环境变量以使用正式上传功能。',
        configStatus: 'incomplete'
      });
    }

    // 上传到腾讯云 COS
    console.log('开始初始化COS客户端');
    const cos = getCOSClient();

    // 构建完整的存储桶名称和地域
    const bucketName = cosConfig.bucket;
    const bucketRegion = cosConfig.region;

    console.log('开始上传到COS');
    const result = await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: bucketName,
        Region: bucketRegion,
        Key: cosPath,
        Body: buffer,
        ContentType: file.type,
        ContentDisposition: `inline; filename="${encodeURIComponent(file.name)}"`,
        StorageClass: 'STANDARD', // 改为标准存储，兼容单可用区和多可用区
        CacheControl: 'max-age=31536000',
        ACL: 'public-read', // 设置公有读权限
      }, (err, data) => {
        if (err) {
          console.error('COS上传失败:', err);
          
          // 提供更友好的错误提示
          let errorMessage = '文件上传失败';
          if (err.code === 'NoSuchBucket') {
            errorMessage = '存储桶不存在，请检查配置';
          } else if (err.code === 'AccessDenied') {
            errorMessage = '访问被拒绝，请检查密钥权限';
          } else if (err.message && err.message.includes('multiple availability zones')) {
            errorMessage = '存储桶配置错误，请检查存储桶类型设置';
          } else if (err.code === 'InvalidAccessKeyId') {
            errorMessage = '密钥ID无效，请检查配置';
          } else if (err.code === 'SignatureDoesNotMatch') {
            errorMessage = '密钥签名不匹配，请检查密钥配置';
          }
          
          reject(new Error(errorMessage));
        } else {
          console.log('COS上传成功:', data);
          resolve(data);
        }
      });
    });

    console.log('COS上传完成，开始获取访问URL');
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
          console.error('获取COS访问URL失败:', err);
          reject(err);
        } else {
          console.log('获取COS访问URL成功:', data.Url);
          resolve(data.Url);
        }
      });
    });

    console.log('文件上传完全成功，返回结果');
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
    console.log('检查上传配置');
    
    // 验证用户身份
    // const authResult = await verifyAuth(req);
    // if (!authResult?.user) {
    //   return ResponseUtil.unauthorized('未登录');
    // }

    const { cosConfig } = tencentCloudConfig;
    
    console.log('COS配置检查:', {
      hasSecretId: !!cosConfig.secretId,
      hasSecretKey: !!cosConfig.secretKey,
      hasBucket: !!cosConfig.bucket,
      hasRegion: !!cosConfig.region,
      bucket: cosConfig.bucket,
      region: cosConfig.region
    });

    return ResponseUtil.success({
      maxImageSize: MAX_IMAGE_SIZE,
      maxVideoSize: MAX_VIDEO_SIZE,
      maxAudioSize: MAX_AUDIO_SIZE,
      allowedImageTypes: ALLOWED_IMAGE_TYPES,
      allowedVideoTypes: ALLOWED_VIDEO_TYPES,
      allowedAudioTypes: ALLOWED_AUDIO_TYPES,
      uploadPath: '/api/common/upload',
      cosConfig: {
        hasSecretId: !!cosConfig.secretId,
        hasSecretKey: !!cosConfig.secretKey,
        hasBucket: !!cosConfig.bucket,
        hasRegion: !!cosConfig.region,
        bucket: cosConfig.bucket,
        region: cosConfig.region
      }
    });
  } catch (error) {
    console.error('获取上传配置失败:', error);
    return ResponseUtil.serverError('获取上传配置失败');
  } 
}
