import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 获取课程章节列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id } = await params;
    const courseId = parseInt(id);

    // 获取章节列表（包含层级结构）
    const chapters = await prisma.courseChapter.findMany({
      where: {
        courseId: courseId,
        parentId: null, // 只获取父章节
      },
      include: {
        uploader: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        children: {
          include: {
            uploader: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            sort: 'asc',
          },
        },
      },
      orderBy: {
        sort: 'asc',
      },
    });

    return ResponseUtil.success(chapters);
  } catch (error) {
    console.error('获取章节列表失败:', error);
    return ResponseUtil.error('获取章节列表失败');
  }
}

// 创建章节
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id } = await params;
    const data = await request.json();
    const {
      title,
      description,
      videoUrl,
      coverUrl,
      courseId,
      points,
      sort,
      parentId,
      duration,
      selectTotalPoints, // 新增
      totalPoints, // 新增
    } = data;

    // 验证课程所有权
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        uploaderId: user.id,
      },
    });

    if (!course) {
      return ResponseUtil.notFound('课程不存在或无权限操作'+ user.id);
    }

    // 创建章节
    const chapter = await prisma.courseChapter.create({
      data: {
        title,
        description,
        videoUrl,
        coverUrl,
        points: points || 0,
        sort: sort || 0, // 如果没有提供排序，默认为0
        courseId,
        parentId,
        uploaderId: user.id,
        duration,
        selectTotalPoints: selectTotalPoints || false, // 新增
        totalPoints: totalPoints || null, // 新增
      },
      include: {
        uploader: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    // 如果是子章节（有parentId），更新课程的episodeCount
    if (parentId) {
      await prisma.course.update({
        where: { id: courseId },
        data: {
          episodeCount: {
            increment: 1,
          },
        },
      });
    }

    return ResponseUtil.success(chapter);
  } catch (error) {
    console.error('创建章节失败:', error);
    return ResponseUtil.error('创建章节失败');
  }
} 