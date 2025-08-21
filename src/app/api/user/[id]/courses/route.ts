import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return ResponseUtil.error('无效的用户ID');
    }

    // 验证当前用户登录状态
    const authResult = await verifyAuth(request);
    if (!authResult?.user?.id) {
      return ResponseUtil.unauthorized('未登录');
    }

    // 获取用户发布的课程
    const courses = await prisma.course.findMany({
      where: {
        uploaderId: userId,
        isDeleted: false
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverUrl: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        _count: {
          select: {
            chapters: true,
            favorites: true,
            ratings: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 格式化数据
    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      coverUrl: course.coverUrl,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      status: course.status,
      chapterCount: course._count.chapters,
      favoriteCount: course._count.favorites,
      ratingCount: course._count.ratings
    }));

    return ResponseUtil.success({
      list: formattedCourses,
      total: formattedCourses.length
    });

  } catch (error) {
    console.error('获取用户课程失败:', error);
    return ResponseUtil.error('获取用户课程失败');
  }
} 