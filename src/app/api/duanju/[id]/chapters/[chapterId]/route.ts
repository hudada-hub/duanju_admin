import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 更新章节
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id, chapterId: chapterIdStr } = await params;
    const courseId = parseInt(id);
    const chapterId = parseInt(chapterIdStr);
    const data = await request.json();
    const {
      title,
      description,
      videoUrl,
      coverUrl,
      points,
      sort,
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
      return ResponseUtil.notFound('课程不存在或无权限操作');
    }

    // 验证章节是否存在
    const existingChapter = await prisma.courseChapter.findFirst({
      where: {
        id: chapterId,
        courseId: courseId,
      },
    });

    if (!existingChapter) {
      return ResponseUtil.notFound('章节不存在');
    }

    // 更新章节
    const chapter = await prisma.courseChapter.update({
      where: {
        id: chapterId,
      },
      data: {
        title,
        description,
        videoUrl,
        coverUrl,
        points: points || 0,
        sort: sort || 0, // 如果没有提供排序，默认为0
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
    
    return ResponseUtil.success(chapter);
  } catch (error) {
    console.error('更新章节失败:', error);
    return ResponseUtil.error('更新章节失败');
  }
}

// 删除章节
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id, chapterId: chapterIdStr } = await params;
    const courseId = parseInt(id);
    const chapterId = parseInt(chapterIdStr);

    // 验证课程所有权
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        uploaderId: user.id,
      },
    });

    if (!course) {
      return ResponseUtil.notFound('课程不存在或无权限操作');
    }

    // 验证章节是否存在
    const existingChapter = await prisma.courseChapter.findFirst({
      where: {
        id: chapterId,
        courseId: courseId,
      },
    });

    if (!existingChapter) {
      return ResponseUtil.notFound('章节不存在');
    }
    
    // 检查是否有子章节
    const hasChildren = await prisma.courseChapter.findFirst({
      where: {
        parentId: chapterId,
      },
    });

    if (hasChildren) {
      return ResponseUtil.error('请先删除所有子章节');
    }
    
    // 删除章节
    await prisma.courseChapter.delete({
      where: {
        id: chapterId,
      },
    });

    // 如果是子章节（有parentId），减少课程的episodeCount
    if (existingChapter.parentId) {
      await prisma.course.update({
        where: { id: courseId },
        data: {
          episodeCount: {
            decrement: 1,
          },
        },
      });
    }
    
    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    console.error('删除章节失败:', error);
    return ResponseUtil.error('删除章节失败');
  }
} 