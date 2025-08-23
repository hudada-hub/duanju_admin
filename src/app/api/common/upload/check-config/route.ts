import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { tencentCloudConfig } from '@/config/tencentcloud';
import COS from 'cos-nodejs-sdk-v5';

export async function GET(req: NextRequest) {
  try {
    const { cosConfig } = tencentCloudConfig;
    
    // 检查配置完整性
    const configCheck = {
      secretId: {
        exists: !!cosConfig.secretId,
        length: cosConfig.secretId?.length || 0,
        valid: cosConfig.secretId && cosConfig.secretId.length > 0
      },
      secretKey: {
        exists: !!cosConfig.secretKey,
        length: cosConfig.secretKey?.length || 0,
        valid: cosConfig.secretKey && cosConfig.secretKey.length > 0
      },
      bucket: {
        exists: !!cosConfig.bucket,
        value: cosConfig.bucket,
        valid: cosConfig.bucket && cosConfig.bucket.length > 0
      },
      region: {
        exists: !!cosConfig.region,
        value: cosConfig.region,
        valid: cosConfig.region && cosConfig.region.length > 0
      }
    };

    // 检查配置是否完整
    const isConfigComplete = configCheck.secretId.valid && 
                           configCheck.secretKey.valid && 
                           configCheck.bucket.valid && 
                           configCheck.region.valid;

    // 如果配置完整，尝试连接COS
    let connectionTest = null;
    if (isConfigComplete) {
      try {
        const cos = new COS({
          SecretId: cosConfig.secretId,
          SecretKey: cosConfig.secretKey,
          Protocol: 'https:',
          Timeout: 10000 // 10秒超时
        });

        // 尝试获取存储桶信息
        await new Promise((resolve, reject) => {
          cos.getBucket({
            Bucket: cosConfig.bucket,
            Region: cosConfig.region
          }, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });

        connectionTest = {
          success: true,
          message: 'COS连接成功',
          bucketInfo: '存储桶可正常访问'
        };
      } catch (error: any) {
        connectionTest = {
          success: false,
          message: 'COS连接失败',
          error: error.message || '未知错误',
          code: error.code || 'UNKNOWN'
        };
      }
    }

    const response = {
      configCheck,
      isConfigComplete,
      connectionTest,
      recommendations: [] as string[]
    };

    // 提供配置建议
    if (!configCheck.secretId.valid) {
      response.recommendations.push('请设置 TENCENT_CLOUD_COS_SECRET_ID 环境变量');
    }
    if (!configCheck.secretKey.valid) {
      response.recommendations.push('请设置 TENCENT_CLOUD_COS_SECRET_KEY 环境变量');
    }
    if (!configCheck.bucket.valid) {
      response.recommendations.push('请设置 TENCENT_CLOUD_COS_BUCKET 环境变量');
    }
    if (!configCheck.region.valid) {
      response.recommendations.push('请设置 TENCENT_CLOUD_COS_REGION 环境变量');
    }

    if (isConfigComplete && connectionTest && !connectionTest.success) {
      if (connectionTest.code === 'NoSuchBucket') {
        response.recommendations.push('存储桶不存在，请检查存储桶名称是否正确');
      } else if (connectionTest.code === 'AccessDenied') {
        response.recommendations.push('访问被拒绝，请检查密钥权限是否包含该存储桶的访问权限');
      } else if (connectionTest.code === 'InvalidAccessKeyId') {
        response.recommendations.push('密钥ID无效，请检查 TENCENT_CLOUD_COS_SECRET_ID 是否正确');
      } else if (connectionTest.code === 'SignatureDoesNotMatch') {
        response.recommendations.push('密钥签名不匹配，请检查 TENCENT_CLOUD_COS_SECRET_KEY 是否正确');
      }
    }

    return ResponseUtil.success(response);

  } catch (error) {
    console.error('检查COS配置失败:', error);
    return ResponseUtil.serverError('检查COS配置失败');
  }
} 