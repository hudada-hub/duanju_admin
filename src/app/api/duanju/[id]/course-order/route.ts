import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 检查用户是否已购买整个短剧
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const shortsId = parseInt((await params).id);
    
    // 检查是否有整个短剧的订单记录
    const shortsOrder = await prisma.shortsOrder.findFirst({
      where: {
        shortsId: shortsId,
        userId: user.id,
        oneTimePayment: true, // 一次性支付订单
      },
    });

    return ResponseUtil.success({
      hasPurchased: !!shortsOrder,
    });
  } catch (error) {
    console.error('检查短剧购买状态失败:', error);
    return ResponseUtil.error('检查短剧购买状态失败');
  }
}

// 创建整个短剧的购买订单
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const shortsId = parseInt((await params).id);
    
    // 获取短剧信息
    const short = await prisma.short.findFirst({
      where: {
        id: shortsId,
        isDeleted: false,
        isHidden: false,
      },
    });

    if (!short) {
      return ResponseUtil.notFound('短剧不存在');
    }

    if (!short.oneTimePayment || short.oneTimePoint <= 0) {
      return ResponseUtil.error('该短剧不支持一次性支付');
    }

    // 获取用户信息（包含积分）
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: { points: true }
    });

    if (!userInfo) {
      return ResponseUtil.error('用户信息不存在');
    }

    // 检查用户积分是否足够
    if (userInfo.points < short.oneTimePoint) {
      return ResponseUtil.error(`积分不足，需要 ${short.oneTimePoint} 积分，当前只有 ${userInfo.points} 积分`);
    }

    // 检查是否已经购买过
    const existingOrder = await prisma.shortsOrder.findFirst({
      where: {
        shortsId: shortsId,
        userId: user.id,
        oneTimePayment: true,
      },
    });

    if (existingOrder) {
      return ResponseUtil.error('您已经购买过此短剧');
    }

    // 扣除用户积分
    await prisma.user.update({
      where: { id: user.id },
      data: {
        points: {
          decrement: short.oneTimePoint,
        },
      },
    });

    // 创建短剧订单
    const shortsOrder = await prisma.shortsOrder.create({
      data: {
        userId: user.id,
        shortsId: shortsId,
        points: short.oneTimePoint,
        oneTimePayment: true,
        oneTimePoint: short.oneTimePoint,
        progress: 0,
      },
    });

    return ResponseUtil.success({
      success: true,
      orderId: shortsOrder.id,
    });
  } catch (error) {
    console.error('创建短剧订单失败:', error);
    return ResponseUtil.error('创建短剧订单失败');
  }
} 