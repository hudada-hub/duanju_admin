import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { getUserFromToken } from '@/utils/server-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const userInfo = await getUserFromToken(request);
    if (!userInfo || userInfo.role !== 'SUPER_ADMIN') {
      return ResponseUtil.error('无权限执行此操作');
    }

    const { id } = await params;
    const { change, reason } = await request.json();

    if (!change || typeof change !== 'number') {
      return ResponseUtil.error('积分变动值不能为空');
    }

    if (!reason || typeof reason !== 'string') {
      return ResponseUtil.error('变动原因不能为空');
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!user) {
      return ResponseUtil.error('用户不存在');
    }

    // 计算新的积分值
    const newPoints = user.points + change;
    if (newPoints < 0) {
      return ResponseUtil.error('积分不能为负数');
    }

    // 更新用户积分
    await prisma.user.update({
      where: { id: Number(id) },
      data: { points: newPoints }
    });

    // 创建积分变动记录（这里可以创建一个积分变动记录表，暂时用订单表记录）
    await prisma.order.create({
      data: {
        orderNo: `POINTS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'RECHARGE',
        title: `积分${change > 0 ? '增加' : '减少'} - ${reason}`,
        amount: Math.abs(change), // 记录变动的绝对值
        status: 'PAID',
        paymentMethod: 'BALANCE',
        userId: Number(id),
        remark: `管理员操作：${reason}`,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
        metadata: {
          type: 'points_change',
          change: change,
          reason: reason,
          operator: userInfo.id,
          operatorName: userInfo.nickname
        }
      }
    });

    return ResponseUtil.success(null, '积分修改成功');
  } catch (error) {
    console.error('修改用户积分失败:', error);
    return ResponseUtil.serverError('修改用户积分失败');
  } 
} 