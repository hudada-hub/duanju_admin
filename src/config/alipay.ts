

// 支付宝沙箱环境配置
export const alipaySandboxConfig = {
  appId: process.env.NEXT_PUBLIC_ALIPAY_SANDBOX_APP_ID || '',
  privateKey: process.env.ALIPAY_SANDBOX_PRIVATE_KEY || '',
  publicKey: process.env.ALIPAY_SANDBOX_PUBLIC_KEY || '',
  gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
  returnUrl: 'http://localhost:3000/payment/result', // 支付结果页面
  notifyUrl: 'http://localhost:3000/api/payment/alipay/notify', // 异步通知接口
  // 提现接口配置
  withdrawUrl: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do', // 提现网关
  withdrawNotifyUrl: 'http://118.31.175.234:3005/api/payment/alipay/withdraw-notify', // 提现异步通知接口
};

// 支付宝正式环境配置
export const alipayProdConfig = {
  appId: process.env.NEXT_PUBLIC_ALIPAY_SANDBOX_APP_ID || '',
  privateKey: process.env.ALIPAY_SANDBOX_PRIVATE_KEY || '',
  publicKey: process.env.ALIPAY_SANDBOX_PUBLIC_KEY || '',
  gateway: 'https://openapi.alipay.com/gateway.do',
  returnUrl: 'https://你的域名/payment/result', // 支付结果页面
  notifyUrl: 'https://你的域名/api/payment/alipay/notify', // 异步通知接口
  // 提现接口配置
  withdrawUrl: 'https://openapi.alipay.com/gateway.do', // 提现网关
  withdrawNotifyUrl: 'https://你的域名/api/payment/alipay/withdraw-notify', // 提现异步通知接口
};

// 支付宝提现接口方法
export const alipayWithdrawMethods = {
  // 单笔转账到支付宝账户
  TRANSFER_TO_ACCOUNT: 'alipay.fund.trans.uni.transfer',
  // 单笔转账到银行卡
  TRANSFER_TO_BANK: 'alipay.fund.trans.uni.transfer',
  // 批量转账到支付宝账户
  BATCH_TRANSFER_TO_ACCOUNT: 'alipay.fund.trans.common.query',
  // 批量转账到银行卡
  BATCH_TRANSFER_TO_BANK: 'alipay.fund.trans.common.query',
};

// 提现状态枚举
export const withdrawStatus = {
  PROCESSING: 'PROCESSING', // 处理中
  SUCCESS: 'SUCCESS', // 成功
  FAILED: 'FAILED', // 失败
  CLOSED: 'CLOSED', // 已关闭
}; 