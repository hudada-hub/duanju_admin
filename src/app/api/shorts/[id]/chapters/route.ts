import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 获取短剧章节列表
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
    const shortsId = parseInt(id);

    // 获取章节列表（包含层级结构）
    const chapters = await prisma.shortsChapter.findMany({
      where: {
        shortsId: shortsId,
        // 根据 schema 调整查询条件
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
    const shortsId = parseInt(id);
    const data = await request.json();
    const {
      title,
      description,
      videoUrl,
      coverUrl,
      points,
      sort,
      duration,
      courseId, // 前端可能还在使用courseId
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

    // 创建章节
    const chapter = await prisma.shortsChapter.create({
      data: {
        title,
        description,
        videoUrl,
        coverUrl,
        points: points || 0,
        sort: sort || 0, // 如果没有提供排序，默认为0
        shorts: {
          connect: { id: shortsId }
        },
        uploader: {
          connect: { id: user.id }
        },
        duration,
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

    // 更新短剧的episodeCount
    await prisma.short.update({
      where: { id: shortsId },
      data: {
        episodeCount: {
          increment: 1,
        },
      },
    });

    return ResponseUtil.success(chapter);
  } catch (error) {
    console.error('创建章节失败:', error);
    return ResponseUtil.error('创建章节失败');
  }
} 