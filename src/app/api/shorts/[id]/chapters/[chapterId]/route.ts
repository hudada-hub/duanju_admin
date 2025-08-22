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
    const shortsId = parseInt(id);
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

    // 验证短剧所有权
    const short = await prisma.short.findFirst({
      where: {
        id: shortsId,
        uploaderId: user.id,
      },
    });

    if (!short) {
      return ResponseUtil.notFound('短剧不存在或无权限操作');
    }

    // 验证章节是否存在
    const existingChapter = await prisma.shortsChapter.findFirst({
      where: {
        id: chapterId,
        shortsId: shortsId,
      },
    });

    if (!existingChapter) {
      return ResponseUtil.notFound('章节不存在');
    }

    // 更新章节
    const chapter = await prisma.shortsChapter.update({
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
    const shortsId = parseInt(id);
    const chapterId = parseInt(chapterIdStr);

    // 验证短剧所有权
    const short = await prisma.short.findFirst({
      where: {
        id: shortsId,
        uploaderId: user.id,
      },
    });

    if (!short) {
      return ResponseUtil.notFound('短剧不存在或无权限操作');
    }

    // 验证章节是否存在
    const existingChapter = await prisma.shortsChapter.findFirst({
      where: {
        id: chapterId,
        shortsId: shortsId,
      },
    });

    if (!existingChapter) {
      return ResponseUtil.notFound('章节不存在');
    }
    
    // 删除章节
    await prisma.shortsChapter.delete({
      where: {
        id: chapterId,
      },
    });

    // 减少短剧的episodeCount
    await prisma.short.update({
      where: { id: shortsId },
      data: {
        episodeCount: {
          decrement: 1,
        },
      },
    });
    
    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    console.error('删除章节失败:', error);
    return ResponseUtil.error('删除章节失败');
  }
} 