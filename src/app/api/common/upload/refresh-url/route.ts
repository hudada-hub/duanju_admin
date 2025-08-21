import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { getCOSClient } from '@/utils/cos';
import { tencentCloudConfig } from '@/config/tencentcloud';

// 获取带签名的访问URL
async function getSignedUrl(key: string) {
  const cos = getCOSClient();
  const { cosConfig } = tencentCloudConfig;

  return new Promise<string>((resolve, reject) => {
    cos.getObjectUrl({
      Bucket: cosConfig.bucket,
      Region: cosConfig.region,
      Key: key,
      Sign: true,
      Expires: 7200, // 2小时有效期
      Protocol: 'https:',
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Url);
      }
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    // const authResult = await verifyAuth(req);
    // if (!authResult?.user) {
    //   return ResponseUtil.unauthorized('未登录');
    // }

    const { path } = await req.json();
    if (!path) {
      return ResponseUtil.error('缺少文件路径');
    }

    // 确保path是相对路径
    const cleanPath = path.replace(/^https?:\/\/[^/]+\//, '');
    const url = await getSignedUrl(cleanPath);

    return ResponseUtil.success({
      url,
      path: cleanPath
    });
  } catch (error) {
    console.error('获取签名URL失败:', error);
    return ResponseUtil.error('获取签名URL失败');
  } 
} 