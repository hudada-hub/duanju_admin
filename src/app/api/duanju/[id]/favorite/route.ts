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

    // 检查是否已收藏
    const existingFavorite = await prisma.courseFavorite.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    });

    if (existingFavorite) {
      // 取消收藏
      await prisma.courseFavorite.delete({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId
          }
        }
      });
      return ResponseUtil.success({ favorited: false });
    } else {
      // 添加收藏
      await prisma.courseFavorite.create({
        data: {
          userId: user.id,
          courseId
        }
      });
      return ResponseUtil.success({ favorited: true });
    }
  } catch (error) {
    console.error('处理课程收藏失败:', error);
    return ResponseUtil.error('处理收藏失败');
  }
} 