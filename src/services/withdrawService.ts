import { alipaySandboxConfig, alipayWithdrawMethods } from '@/config/alipay';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WithdrawRequest {
  taskId: number;
  amount: number;
  accountType: 'alipay' | 'bankcard';
  accountInfo: {
    account: string;
    realName: string;
  };
}

export interface WithdrawResponse {
  withdrawId: number;
  amount: number;
  fee: number;
  status: string;
}

export class WithdrawService {
  /**
   * 检测并转换私钥格式
   */
  private static formatPrivateKey(rawPrivateKey: string): string {
    // 移除可能的空格和换行符
    const cleanKey = rawPrivateKey.replace(/\s/g, '');
    
    // 如果已经是PEM格式，直接返回
    if (cleanKey.includes('-----BEGIN')) {
      return rawPrivateKey;
    }
    
    // 根据长度判断格式，您的私钥是1024字符，应该使用PKCS#1格式
    if (cleanKey.length >= 1024) {
      // 长Base64字符串，使用PKCS#1格式（RSA私钥）
      return `-----BEGIN RSA PRIVATE KEY-----\n${cleanKey}\n-----END RSA PRIVATE KEY-----`;
    } else {
      // 短私钥，使用PKCS#8格式
      return `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----`;
    }
  }

  /**
   * 处理支付宝提现
   */
  static async processAlipayWithdraw(request: WithdrawRequest): Promise<WithdrawResponse> {
    try {
      const { taskId, amount, accountType, accountInfo } = request;

      // 计算提现金额（扣除10%手续费）
      const fee = amount * 0.1;
      const actualAmount = amount - fee;

      // 检查私钥是否配置
      if (!alipaySandboxConfig.privateKey) {
        throw new Error('支付宝私钥未配置');
      }

      // 添加调试信息
      console.log('支付宝配置信息:', {
        appId: alipaySandboxConfig.appId,
        privateKeyLength: alipaySandboxConfig.privateKey.length,
        privateKeyStart: alipaySandboxConfig.privateKey.substring(0, 50),
        privateKeyEnd: alipaySandboxConfig.privateKey.substring(alipaySandboxConfig.privateKey.length - 50),
        withdrawUrl: alipaySandboxConfig.withdrawUrl
      });

      // 构建支付宝提现请求参数
      const withdrawParams: any = {
        app_id: alipaySandboxConfig.appId,
        method: alipayWithdrawMethods.TRANSFER_TO_ACCOUNT,
        charset: 'utf-8',
        sign_type: 'RSA2', // 固定使用RSA2
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: '1.0',
        biz_content: JSON.stringify({
          out_biz_no: `WITHDRAW_${taskId}_${Date.now()}`, // 商户提现单号
          trans_amount: actualAmount.toFixed(2), // 提现金额
          product_code: 'TRANS_ACCOUNT_NO_PWD', // 产品码
          biz_scene: 'DIRECT_TRANSFER', // 业务场景：直接转账
          payee_info: {
            identity: accountInfo.account, // 收款方账户
            identity_type: accountType === 'alipay' ? 'ALIPAY_LOGON_ID' : 'BANKCARD_ACCOUNT', // 收款方账户类型
            name: accountInfo.realName // 收款方真实姓名
          },
          remark: `任务${taskId}完成奖励提现`,
          // 添加其他可能需要的参数
          order_title: `任务${taskId}奖励提现`,
          order_memo: `任务完成奖励，积分：${amount}，实际到账：${actualAmount.toFixed(2)}`
        })
      };

      console.log('支付宝请求参数:', {
        app_id: withdrawParams.app_id,
        method: withdrawParams.method,
        sign_type: withdrawParams.sign_type,
        timestamp: withdrawParams.timestamp,
        biz_content: withdrawParams.biz_content
      });

      // 生成签名
      const signString = Object.keys(withdrawParams)
        .filter(key => key !== 'sign')
        .sort()
        .map(key => `${key}=${withdrawParams[key]}`)
        .join('&');

      console.log('待签名字符串:', signString);
      
      let signature: string;
      try {
        // 使用专门的私钥格式化函数
        const privateKey = this.formatPrivateKey(alipaySandboxConfig.privateKey);
        console.log('格式化后的私钥长度:', privateKey.length);
        console.log('私钥格式:', privateKey.includes('-----BEGIN PRIVATE KEY-----') ? 'PKCS#8' : 'PKCS#1');
        
        // 固定使用RSA-SHA256算法
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signString, 'utf8');
        signature = sign.sign(privateKey, 'base64');
        console.log('签名生成成功，长度:', signature.length);
        
        // 验证签名是否正确
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(signString, 'utf8');
        const isValid = verify.verify(privateKey, signature, 'base64');
        console.log('签名验证结果:', isValid);
        
        if (!isValid) {
          throw new Error('签名验证失败');
        }
      } catch (signError) {
        console.error('签名生成失败:', signError);
        console.error('原始私钥长度:', alipaySandboxConfig.privateKey.length);
        console.error('原始私钥前50字符:', alipaySandboxConfig.privateKey.substring(0, 50));
        console.error('原始私钥后50字符:', alipaySandboxConfig.privateKey.substring(alipaySandboxConfig.privateKey.length - 50));
        throw new Error('私钥签名失败，请检查私钥格式');
      }
      
      withdrawParams.sign = signature;

      // 发送提现请求到支付宝沙盒
      const response = await fetch(alipaySandboxConfig.withdrawUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(withdrawParams)
      });

      const result = await response.text();
      console.log('支付宝原始响应:', result);
      
      // 解析支付宝响应
      let alipayResponse: any;
      try {
        // 尝试直接解析JSON
        alipayResponse = JSON.parse(result);
      } catch (parseError) {
        // 如果直接解析失败，尝试解析嵌套的响应
        console.log('直接解析失败，尝试解析嵌套响应');
        try {
          // 查找包含alipay_fund_trans_uni_transfer_response的键
          const responseParams = new URLSearchParams(result);
          for (const [key, value] of responseParams.entries()) {
            if (key.includes('alipay_fund_trans_uni_transfer_response')) {
              alipayResponse = JSON.parse(key);
              break;
            }
          }
        } catch (nestedError) {
          console.error('嵌套响应解析也失败:', nestedError);
          throw new Error('无法解析支付宝响应');
        }
      }
      
      console.log('解析后的支付宝响应:', alipayResponse);

      // 检查支付宝响应
      if (alipayResponse.alipay_fund_trans_uni_transfer_response) {
        const response = alipayResponse.alipay_fund_trans_uni_transfer_response;
        if (response.code && response.code !== '10000') {
          // 处理可能的编码问题
          const errorMsg = response.msg || response.sub_msg || '未知错误';
          console.log('支付宝错误信息:', {
            code: response.code,
            msg: response.msg,
            sub_code: response.sub_code,
            sub_msg: response.sub_msg
          });
          throw new Error(`支付宝提现失败: ${errorMsg}`);
        }
      } else if (alipayResponse.code && alipayResponse.code !== '10000') {
        const errorMsg = alipayResponse.msg || alipayResponse.sub_msg || '未知错误';
        throw new Error(`支付宝提现失败: ${errorMsg}`);
      }

      // 返回提现结果
      return {
        withdrawId: Date.now(), // 临时ID，实际应该从数据库获取
        amount: actualAmount,
        fee: fee,
        status: 'PROCESSING'
      };

    } catch (error) {
      console.error('支付宝提现处理失败:', error);
      throw new Error('支付宝提现处理失败: ' + (error as Error).message);
    }
  }

  /**
   * 更新任务状态为提现请求中
   */
  static async updateTaskStatusToWithdrawRequested(taskId: number): Promise<void> {
    try {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED', // 使用已存在的状态，表示任务已完成并进入提现流程
          updatedAt: new Date()
        }
      });
      console.log('任务状态已更新为提现请求中:', taskId);
    } catch (error) {
      console.error('更新任务状态失败:', error);
      throw new Error('更新任务状态失败');
    }
  }

  /**
   * 验证提现请求参数
   */
  static validateWithdrawRequest(request: WithdrawRequest): boolean {
    return !!(request.taskId && request.amount && request.accountType && request.accountInfo);
  }

  /**
   * 计算提现手续费
   */
  static calculateFee(amount: number, feeRate: number = 0.1): { fee: number; actualAmount: number } {
    const fee = amount * feeRate;
    const actualAmount = amount - fee;
    return { fee, actualAmount };
  }
} 