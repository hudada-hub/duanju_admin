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

    // 获取用户发布的短剧
    const shorts = await prisma.short.findMany({
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
        viewCount: true,
        likeCount: true,
        favoriteCount: true,
        episodeCount: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 格式化数据
    const formattedShorts = shorts.map(short => ({
      id: short.id,
      title: short.title,
      description: short.description,
      coverUrl: short.coverUrl,
      createdAt: short.createdAt.toISOString(),
      updatedAt: short.updatedAt.toISOString(),
      status: short.status,
      viewCount: short.viewCount,
      likeCount: short.likeCount,
      favoriteCount: short.favoriteCount,
      episodeCount: short.episodeCount
    }));

    return ResponseUtil.success({
      list: formattedShorts,
      total: formattedShorts.length
    });

  } catch (error) {
    console.error('获取用户短剧失败:', error);
    return ResponseUtil.error('获取用户短剧失败');
  }
} 