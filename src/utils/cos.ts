
import COS from 'cos-nodejs-sdk-v5';
import type { CosError, GetObjectUrlResult } from 'cos-nodejs-sdk-v5';
import { tencentCloudConfig } from '@/config/tencentcloud';

// 获取COS客户端实例
export function getCOSClient() {
  const { cosConfig } = tencentCloudConfig;
  return new COS({
    SecretId: cosConfig.secretId,
    SecretKey: cosConfig.secretKey,
  });
}

// 获取带签名的访问URL
export async function getSignedUrl(key: string): Promise<string> {
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
        reject(new Error('获取签名URL失败'));
      } else {
        resolve(data.Url);
      }
    });
  });
} 