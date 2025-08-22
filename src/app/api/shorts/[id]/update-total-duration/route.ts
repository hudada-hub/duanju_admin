import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

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
    const shortId = parseInt(id);

    // 检查短剧是否存在且属于当前用户
    const existingShort = await prisma.short.findFirst({
      where: {
        id: shortId,
        uploaderId: user.id,
        isDeleted: false,
      },
    });

    if (!existingShort) {
      return ResponseUtil.notFound('短剧不存在或无权限修改');
    }

    // 计算所有章节的总时长
    const totalDuration = await prisma.shortsChapter.aggregate({
      where: {
        shortsId: shortId,
        duration: {
          not: null,
        },
      },
      _sum: {
        duration: true,
      },
    });

    // 更新短剧的总时长
    const updatedShort = await prisma.short.update({
      where: {
        id: shortId,
      },
      data: {
        totalDuration: totalDuration._sum.duration || 0,
      },
    });

    return ResponseUtil.success({
      totalDuration: updatedShort.totalDuration,
    });
  } catch (error) {
    console.error('更新短剧总时长失败:', error);
    return ResponseUtil.error('更新短剧总时长失败');
  }
} 