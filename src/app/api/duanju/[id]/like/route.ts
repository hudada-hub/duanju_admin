import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userData = await verifyAuth(request);
    const user = userData?.user;
    if (!user?.id) {
      return ResponseUtil.error('请先登录');
    }

    const { id } = await params;
    const courseId = parseInt(id);
    
    // 检查课程是否存在
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return ResponseUtil.error('课程不存在');
    }

    // 检查是否已点赞
    const existingLike = await prisma.courseLike.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    });

    if (existingLike) {
      // 取消点赞
      await prisma.courseLike.delete({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId
          }
        }
      });
      return ResponseUtil.success({ liked: false });
    } else {
      // 添加点赞
      await prisma.courseLike.create({
        data: {
          userId: user.id,
          courseId
        }
      });
      return ResponseUtil.success({ liked: true });
    }
  } catch (error) {
    console.error('处理课程点赞失败:', error);
    return ResponseUtil.error('处理点赞失败');
  }
} 