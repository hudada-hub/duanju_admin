import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { alipaySandboxConfig } from '@/config/alipay';
import crypto from 'crypto';

// 支付宝提现回调接口
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const notifyData: any = {};
    
    // 解析表单数据
    for (const [key, value] of formData.entries()) {
      notifyData[key] = value;
    }

    console.log('支付宝提现回调数据:', notifyData);

    // 验证签名
    const isValid = await verifyAlipaySignature(notifyData);
    if (!isValid) {
      console.error('支付宝回调签名验证失败');
      return new Response('fail', { status: 400 });
    }

    // 解析业务数据
    const bizContent = JSON.parse(notifyData.biz_content || '{}');
    const outBizNo = bizContent.out_biz_no;
    
    if (!outBizNo) {
      console.error('缺少out_biz_no参数');
      return new Response('fail', { status: 400 });
    }

    // 从out_biz_no中提取任务ID
    const taskIdMatch = outBizNo.match(/WITHDRAW_(\d+)_/);
    if (!taskIdMatch) {
      console.error('无法从out_biz_no中提取任务ID:', outBizNo);
      return new Response('fail', { status: 400 });
    }

    const taskId = parseInt(taskIdMatch[1]);
    console.log('处理任务ID:', taskId);

    // 检查任务状态
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignment: true
      }
    });

    if (!task) {
      console.error('任务不存在:', taskId);
      return new Response('fail', { status: 400 });
    }

    // 根据支付宝回调状态更新任务
    if (notifyData.trade_status === 'TRADE_SUCCESS') {
      // 提现成功
      

      // 更新提现记录状态
      await prisma.withdrawRecord.updateMany({
        where: { taskId: taskId },
        data: {
          status: 'SUCCESS',
          updatedAt: new Date()
        }
      });

      console.log('任务提现状态更新为成功:', taskId);
    } else if (notifyData.trade_status === 'TRADE_FAILED') {
      // 提现失败
     
      // 更新提现记录状态
      await prisma.withdrawRecord.updateMany({
        where: { taskId: taskId },
        data: {
          status: 'FAILED',
          updatedAt: new Date()
        }
      });

      console.log('任务提现状态更新为失败:', taskId);
    }

    // 返回成功响应给支付宝
    return new Response('success', { status: 200 });

  } catch (error) {
    console.error('处理支付宝提现回调失败:', error);
    return new Response('fail', { status: 500 });
  } 
}

// 验证支付宝签名
async function verifyAlipaySignature(notifyData: any): Promise<boolean> {
  try {
    const sign = notifyData.sign;
    if (!sign) {
      console.error('缺少签名参数');
      return false;
    }

    // 移除签名参数，构建待验证字符串
    const verifyData = { ...notifyData };
    delete verifyData.sign;
    delete verifyData.sign_type;

    const signString = Object.keys(verifyData)
      .filter(key => verifyData[key] !== '')
      .sort()
      .map(key => `${key}=${verifyData[key]}`)
      .join('&');

    console.log('待验证签名字符串:', signString);

    // 使用支付宝公钥验证签名
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signString, 'utf8');
    
    const publicKey = alipaySandboxConfig.publicKey;
    if (!publicKey) {
      console.error('支付宝公钥未配置');
      return false;
    }

    // 格式化公钥
    let formattedPublicKey = publicKey;
    if (!publicKey.includes('-----BEGIN')) {
      formattedPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }

    const isValid = verify.verify(formattedPublicKey, sign, 'base64');
    console.log('签名验证结果:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('签名验证过程出错:', error);
    return false;
  }
} 