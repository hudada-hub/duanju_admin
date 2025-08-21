// 腾讯云配置
export const tencentCloudConfig = {
  // 腾讯云账户密钥对
  secretId: process.env.TENCENT_CLOUD_SECRET_ID || '',
  secretKey: process.env.TENCENT_CLOUD_SECRET_KEY || '',

  // 短信应用配置
  smsConfig: {
    sdkAppId: process.env.TENCENT_CLOUD_SMS_SDK_APP_ID || '',
    signName: process.env.TENCENT_CLOUD_SMS_SIGN_NAME || '',
    // 验证码短信模板ID
    templateId: process.env.TENCENT_CLOUD_SMS_TEMPLATE_ID || '',
  },

  // 地域配置
  region: 'ap-guangzhou', // 默认使用广州区域

  // COS 对象存储配置
  cosConfig: {
    secretId: process.env.TENCENT_CLOUD_COS_SECRET_ID || process.env.TENCENT_CLOUD_SECRET_ID || '',
    secretKey: process.env.TENCENT_CLOUD_COS_SECRET_KEY || process.env.TENCENT_CLOUD_SECRET_KEY || '',
    bucket: process.env.TENCENT_CLOUD_COS_BUCKET || '',
    region: process.env.TENCENT_CLOUD_COS_REGION || 'ap-guangzhou',
    cdnDomain: process.env.TENCENT_CLOUD_COS_CDN_DOMAIN || '', // 可选的 CDN 域名
  }
}; 