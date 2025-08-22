import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 记录学习进度的函数
async function recordLearningProgress(userId: number, shortsId: number, chapterId: number, progress: number) {
  try {
    // 如果进度达到100%，不再记录
    if (progress >= 100) {
      return;
    }

    // 查找最近的记录
    const existingLog = await prisma.shortsChapterLog.findFirst({
      where: {
        userId,
        shortsId,
        chapterId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // 如果没有记录或进度有变化，则记录
    if (!existingLog || existingLog.progress !== progress) {
      await prisma.shortsChapterLog.create({
        data: {
          userId,
          shortsId,
          chapterId,
          progress,
        },
      });
    }
  } catch (error) {
    console.error('记录学习进度失败:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 获取当前用户信息（可选）
    const userData = await verifyAuth(request);
    const userId = userData?.user?.id;
    
    // 调试信息
    console.log('API Debug - userData:', userData);
    console.log('API Debug - userId:', userId);

    const shortsId = parseInt((await params).id);
    
    // 从查询参数获取章节ID和进度
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const progress = searchParams.get('progress');
    
    // 如果提供了章节ID和进度，记录学习进度
    if (userId && chapterId && progress !== null) {
      const chapterIdNum = parseInt(chapterId);
      const progressNum = parseInt(progress);
      
      if (!isNaN(chapterIdNum) && !isNaN(progressNum)) {
        await recordLearningProgress(userId, shortsId, chapterIdNum, progressNum);
      }
    }
    const short = await prisma.short.findFirst({
      where: {
        id: shortsId,
        isDeleted: false,
        isHidden: false,
      },
      include: {
        chapters: {
          where: {
            // 根据 schema 调整查询条件
          },
          orderBy: {
            sort: 'asc',
          },
          select: {
            id: true,
            title: true,
            description: true,
            points: true,
            totalPoints: true,
            duration: true,
            sort: true,
            coverUrl: true, 
            uploaderId: true, // 添加上传者ID
          }
        },
        category: {
          select: {
            name: true,
          },
        },
        direction: {
          select: {
            name: true,
          },
        },
        uploader: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            likes: true,
            favorites: true,
          },
        },
      },
    });

    if (!short) {
      return ResponseUtil.error('短剧不存在');
    }

    // 获取学习人数统计
    const studentCount = await prisma.shortsOrder.groupBy({
      by: ['userId'],
      where: {
        shortsId: shortsId,
      },
    });

    // 获取总章节数
    const totalChapters = await prisma.shortsChapter.count({
      where: {
        shortsId: shortsId,
      },
    });

    // 获取已学习章节数
    const learnedChapters = userId ? await prisma.shortsOrder.count({
      where: {
        shortsId: shortsId,
        userId: userId,
      },
    }) : 0;

    // 检查是否有付费章节
    const hasPaidChapters = await prisma.shortsChapter.findFirst({
      where: {
        shortsId: shortsId,
        points: {
          gt: 0,
        },
      },
    });

    const isFree = !hasPaidChapters;

    // 获取短剧所需积分
    let requiredPoints = 0;
    if (short?.oneTimePayment && short.oneTimePoint > 0) {
      requiredPoints = short.oneTimePoint;
    } else if (!isFree) {
      const totalPoints = await prisma.shortsChapter.aggregate({
        where: {
          shortsId: shortsId,
          points: {
            gt: 0,
          },
        },
        _sum: {
          points: true,
        },
      });
      requiredPoints = totalPoints._sum.points || 0;
    }

    // 转换响应数据格式
    const response = {
      ...short,
      chapters: short.chapters,
      isLiked: false, // 简化处理
      isFavorited: false, // 简化处理
      likeCount: short._count.likes,
      favoriteCount: short._count.favorites,
      studentCount: studentCount.length,
      totalChapters: totalChapters,
      learnedChapters: learnedChapters,
      categoryName: short.category?.name || '未分类',
      directionName: short.direction?.name || '未分类',
      requiredPoints,
      level: 'BEGINNER', // 默认值
      totalDuration: short.totalDuration,
      episodeCount: short.episodeCount,
      viewCount: short.viewCount,
      instructor: short.instructor,
      oneTimePayment: short.oneTimePayment,
      oneTimePoint: short.oneTimePoint,
      uploader: short.uploader,
      uploaderId: short.uploaderId,
    };

    return ResponseUtil.success(response);
  } catch (error) {
    console.error('获取短剧详情失败:', error);
    return ResponseUtil.error('获取短剧详情失败');
  }
}

// 更新短剧
export async function PUT(
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
      coverUrl,
      instructor,
      categoryId,
      directionId,
      targetAudience,
      shortsGoals,
      oneTimePayment = false,
      oneTimePoint = 0,
      shortsware = null,
    } = data;

    // 检查短剧是否存在且属于当前用户
    const existingShort = await prisma.short.findFirst({
      where: {
        id: shortsId,
        uploaderId: user.id,
        isDeleted: false,
      },
    });

    if (!existingShort) {
      return ResponseUtil.notFound('短剧不存在或无权限修改');
    }

    // 更新短剧
    const short = await prisma.short.update({
      where: {
        id: shortsId,
      },
      data: {
        title,
        description,
        summary: description,
        coverUrl,
        instructor,
        categoryId: parseInt(categoryId),
        directionId: parseInt(directionId),
        targetAudience,
        shortsGoals,
        oneTimePayment,
        oneTimePoint: parseInt(oneTimePoint),
        shortsware,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        direction: {
          select: {
            id: true,
            name: true
          }
        },
      },
    });

    return ResponseUtil.success(short);
  } catch (error) {
    console.error('更新短剧失败:', error);
    return ResponseUtil.error('更新短剧失败');
  }
}

// 删除短剧
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id } = await params;
    const shortsId = parseInt(id);

    // 检查短剧是否存在且属于当前用户
    const existingShort = await prisma.short.findFirst({
      where: {
        id: shortsId,
        uploaderId: user.id,
        isDeleted: false,
      },
    });

    if (!existingShort) {
      return ResponseUtil.notFound('短剧不存在或无权限删除');
    }

    // 软删除短剧（标记为已删除，而不是真正删除）
    await prisma.short.update({
      where: {
        id: shortsId,
      },
      data: {
        isDeleted: true,
      },
    });

    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    console.error('删除短剧失败:', error);
    return ResponseUtil.error('删除短剧失败');
  }
} 