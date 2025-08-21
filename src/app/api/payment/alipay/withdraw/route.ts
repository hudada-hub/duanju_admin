import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';
import { UserRole } from '@prisma/client';
import { WithdrawService, WithdrawRequest } from '@/services/withdrawService';

// 支付宝提现接口
export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const authResult = await verifyAuth(request);
    if (!authResult?.user?.id) {
      return ResponseUtil.error('未登录或登录已过期');
    }

    // 检查是否为管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.user.id }
    });
    
    if (!currentUser || currentUser.role === UserRole.USER) {
      return ResponseUtil.error('没有权限访问');
    }

    const withdrawRequest: WithdrawRequest = await request.json();

    if (!WithdrawService.validateWithdrawRequest(withdrawRequest)) {
      return ResponseUtil.error('参数不完整');
    }

    const { taskId, amount, accountType, accountInfo } = withdrawRequest;

    // 验证任务是否存在且状态正确
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId.toString()) },
      include: {
        assignment: {
          include: {
            assignee: true
          }
        }
      }
    });

    if (!task) {
      return ResponseUtil.error('任务不存在');
    }

    // 检查任务状态是否允许提现
    const canWithdraw = (task.noNeedMeConfirmed && task.status === 'ADMIN_CONFIRMED') ||
                       (!task.noNeedMeConfirmed && task.status === 'PUBLISHER_CONFIRMED');

    if (!canWithdraw) {
      return ResponseUtil.error('任务状态不允许提现');
    }

    // 检查是否已经提现过
    const existingWithdraw = await prisma.withdrawRecord.findFirst({
      where: { taskId: parseInt(taskId.toString()) }
    });

    if (existingWithdraw) {
      return ResponseUtil.error('该任务已经提现过');
    }

    // 使用提现服务处理提现
    const withdrawResult = await WithdrawService.processAlipayWithdraw(withdrawRequest);

    // 更新任务状态为提现请求中
    await WithdrawService.updateTaskStatusToWithdrawRequested(parseInt(taskId.toString()));

    // 创建提现记录（暂时注释掉，等Prisma生成完成）
    // const withdrawRecord = await prisma.withdrawRecord.create({
    //   data: {
    //     taskId: parseInt(taskId.toString()),
    //     userId: task.assignment?.assigneeId || 0,
    //     amount: amount,
    //     actualAmount: withdrawResult.amount,
    //     fee: withdrawResult.fee,
    //     accountType: accountType,
    //     accountInfo: accountInfo,
    //     status: 'PROCESSING',
    //     alipayOrderId: withdrawResult.withdrawId.toString(),
    //     alipayResponse: {},
    //     createdAt: new Date()
    //   }
    // });

    return ResponseUtil.success(withdrawResult, '提现申请已提交，正在处理中');

  } catch (error) {
    console.error('提现失败:', error);
    return ResponseUtil.error('提现失败: ' + (error as Error).message);
  } 
}

// 查询提现状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withdrawId = searchParams.get('withdrawId');

    if (!withdrawId) {
      return ResponseUtil.error('缺少提现ID');
    }

    // 暂时注释掉，等Prisma生成完成
    // const withdrawRecord = await prisma.withdrawRecord.findUnique({
    //   where: { id: parseInt(withdrawId) }
    // });

    // if (!withdrawRecord) {
    //   return ResponseUtil.error('提现记录不存在');
    // }

    // return ResponseUtil.success(withdrawRecord);
    return ResponseUtil.success({ message: '提现状态查询功能待完善' });

  } catch (error) {
    console.error('查询提现状态失败:', error);
    return ResponseUtil.error('查询提现状态失败');
  } 
} 