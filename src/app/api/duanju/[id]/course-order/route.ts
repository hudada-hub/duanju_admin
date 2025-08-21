import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 检查用户是否已购买整个课程
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const courseId = parseInt((await params).id);
    
    // 检查是否有整个课程的订单记录
    const courseOrder = await prisma.courseOrder.findFirst({
      where: {
        courseId: courseId,
        userId: user.id,
        oneTimePayment: true, // 一次性支付订单
      },
    });

    return ResponseUtil.success({
      hasPurchased: !!courseOrder,
    });
  } catch (error) {
    console.error('检查课程购买状态失败:', error);
    return ResponseUtil.error('检查课程购买状态失败');
  }
}

// 创建整个课程的购买订单
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const courseId = parseInt((await params).id);
    
    // 获取课程信息
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        isDeleted: false,
        isHidden: false,
      },
    });

    if (!course) {
      return ResponseUtil.notFound('课程不存在');
    }

    if (!course.oneTimePayment || course.oneTimePoint <= 0) {
      return ResponseUtil.error('该课程不支持一次性支付');
    }

    // 检查用户积分是否足够
    if (user.points < course.oneTimePoint) {
      return ResponseUtil.error(`积分不足，需要 ${course.oneTimePoint} 积分，当前只有 ${user.points} 积分`);
    }

    // 检查是否已经购买过
    const existingOrder = await prisma.courseOrder.findFirst({
      where: {
        courseId: courseId,
        userId: user.id,
        oneTimePayment: true,
      },
    });

    if (existingOrder) {
      return ResponseUtil.error('您已经购买过此课程');
    }

    // 扣除用户积分
    await prisma.user.update({
      where: { id: user.id },
      data: {
        points: {
          decrement: course.oneTimePoint,
        },
      },
    });

    // 创建课程订单
    const courseOrder = await prisma.courseOrder.create({
      data: {
        userId: user.id,
        courseId: courseId,
        points: course.oneTimePoint,
        oneTimePayment: true,
        oneTimePoint: course.oneTimePoint,
        progress: 0,
      },
    });

    return ResponseUtil.success({
      success: true,
      orderId: courseOrder.id,
    });
  } catch (error) {
    console.error('创建课程订单失败:', error);
    return ResponseUtil.error('创建课程订单失败');
  }
} 