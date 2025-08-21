import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 更新章节学习进度
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id, chapterId } = await params;
    const courseId = parseInt(id);
    const chapterIdNum = parseInt(chapterId);
    
    const body = await request.json();
    const { progress } = body;

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return ResponseUtil.error('进度值无效，必须在0-100之间');
    }

    // 查找用户的课程订单记录
    const courseOrder = await prisma.courseOrder.findFirst({
      where: {
        userId: user.id,
        courseId: courseId,
        OR: [
          // 检查是否有该章节的单独订单
          { chapterId: chapterIdNum },
          // 检查是否有一次性购买整个课程的订单
          { oneTimePayment: true, chapterId: null }
        ],
      },
    });

    if (!courseOrder) {
      return ResponseUtil.error('您尚未购买该章节或课程');
    }

    // 使用事务同时更新学习进度和用户学习时长
    const [updatedOrder] = await prisma.$transaction([
      // 更新学习进度
      prisma.courseOrder.update({
        where: { id: courseOrder.id },
        data: {
          progress: progress,
          updatedAt: new Date(),
        },
      }),
      // 更新用户学习时长，每次加5分钟
      prisma.user.update({
        where: { id: user.id },
        data: {
          studyTime: {
            increment: 5, // 每次学习增加5分钟
          },
        },
      }),
    ]);

    return ResponseUtil.success({
      success: true,
      progress: updatedOrder.progress,
    });
  } catch (error) {
    console.error('更新学习进度失败:', error);
    return ResponseUtil.error('更新学习进度失败');
  }
}

// 获取章节学习进度
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id, chapterId } = await params;
    const courseId = parseInt(id);
    const chapterIdNum = parseInt(chapterId);

    // 查找学习进度记录
    const courseOrder = await prisma.courseOrder.findFirst({
      where: {
        userId: user.id,
        courseId: courseId,
        OR: [
          // 检查是否有该章节的单独订单
          { chapterId: chapterIdNum },
          // 检查是否有一次性购买整个课程的订单
          { oneTimePayment: true, chapterId: null }
        ],
      },
    });

    return ResponseUtil.success({
      progress: courseOrder?.progress || 0,
    });
  } catch (error) {
    console.error('获取学习进度失败:', error);
    return ResponseUtil.error('获取学习进度失败');
  }
} 