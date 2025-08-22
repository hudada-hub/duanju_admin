import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 查询订单
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { id, chapterId } = await params;
    
    // 先获取章节信息，检查积分
    const currentChapter = await prisma.shortsChapter.findUnique({
      where: {
        id: Number(chapterId),
        shortsId: Number(id),
      },
      select: {
        videoUrl: true,
        points: true, // 添加积分字段
      },
    });

    if (!currentChapter) {
      return ResponseUtil.notFound('章节不存在');
    }

    // 需要登录检查
    const userData = await verifyAuth(req);

    // 如果章节积分为0，检查用户登录状态
    if (currentChapter.points === 0) {
      // 如果用户未登录，直接返回视频信息
      if (!userData?.user?.id) {
        return ResponseUtil.success({
          videoUrl: currentChapter.videoUrl,
          hasPurchased: true,
          isFree: true, // 标记为免费章节
        });
      } else {
        // 如果用户已登录，返回需要创建免费订单的信息
        return ResponseUtil.success({
          videoUrl: currentChapter.videoUrl,
          hasPurchased: false,
          isFree: true,
          needsFreeOrder: true, // 标记需要创建免费订单
        });
      }
    }

    if (!userData?.user?.id) {
      return ResponseUtil.serverError('请先登录');
    }

    // 增加短剧浏览量
    await prisma.short.update({
      where: { id: Number(id) },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // 先检查短剧是否支持一次性支付
    const short = await prisma.short.findUnique({
      where: { id: Number(id) },
      
    });

    // 先检查是否是一次性购买整个短剧
    const oneTimeOrder = await prisma.shortsOrder.findFirst({
      where: {
        userId: userData.user.id,
        shortsId: Number(id),
      },
    });

    if (oneTimeOrder) {
      // 如果是一次性购买，获取章节信息
      const chapter = await prisma.shortsChapter.findUnique({
        where: {
          id: Number(chapterId),
          shortsId: Number(id),
        },
        select: {
          videoUrl: true,
        },
      });

      if (chapter) {
        return ResponseUtil.success({
          videoUrl: chapter.videoUrl,
          hasPurchased: true,
          isOneTimePurchase: true,
        });
      }
    }

    // 如果没有一次性购买，检查是否有该章节的单独订单
    const chapterOrder = await prisma.shortsOrder.findFirst({
      where: {
        userId: userData.user.id,
        shortsId: Number(id),
        chapterId: Number(chapterId),
      },
    });

    if (chapterOrder) {
      // 如果找到章节订单，获取章节信息
      const chapter = await prisma.shortsChapter.findUnique({
        where: {
          id: Number(chapterId),
          shortsId: Number(id),
        },
        select: {
          videoUrl: true,
        },
      });

      if (chapter) {
        return ResponseUtil.success({
          videoUrl: chapter.videoUrl,
          hasPurchased: true,
        });
      }
    }


    // 返回需要购买的信息
    return ResponseUtil.success({
      hasPurchased: false,
      points: currentChapter.points,
      message: `需要 ${currentChapter.points} 积分购买此章节`
    });

  } catch (error) {
    console.error('查询订单失败:', error);
    return ResponseUtil.error('查询订单失败');
  }
}

// 创建订单
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { user } = await verifyAuth(req);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id, chapterId } = await params;
    const shortsId = parseInt(id);

    // 先获取必要的数据，避免在事务中执行过多查询
    const short = await prisma.short.findUnique({
      where: { id: shortsId },
      select: {
    
        uploaderId: true,
      },
    });

    const chapter = await prisma.shortsChapter.findUnique({
      where: {
        id: parseInt(chapterId),
        shortsId,
      },
      select: {
        id: true,
        title: true,
        points: true,
        uploaderId: true,
      },
    });

    if (!short || !chapter) {
      return ResponseUtil.notFound('短剧或章节不存在');
    }

    // 获取用户当前积分
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { points: true },
    });

    if (!currentUser) {
      return ResponseUtil.error('用户信息不存在');
    }

    // 检查用户是否为短剧上传者
    const isUploader = short?.uploaderId === user.id;

    let orderToCreate: any;
    let pointsToDeduct = 0;
    let targetChapterId: number | null = parseInt(chapterId);

 
      // 检查是否已经购买过该章节
      const existingOrder = await prisma.shortsOrder.findFirst({
        where: {
          userId: user.id,
          shortsId,
          chapterId: parseInt(chapterId),
        },
      });

      if (existingOrder) {
        return ResponseUtil.error('您已经购买过此章节');
      }

      // 如果是上传者，不需要检查积分和扣除积分
      if (!isUploader && currentUser.points < chapter.points) {
        throw new Error(`积分不足，需要 ${chapter.points} 积分购买此章节`);
      }

      // 创建章节订单
      orderToCreate = {
        userId: user.id,
        shortsId,
        chapterId: parseInt(chapterId),
        points: isUploader ? 0 : chapter.points, // 上传者积分为0
      };
      pointsToDeduct = isUploader ? 0 : chapter.points; // 上传者不扣除积分


    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 增加短剧浏览量
      await tx.short.update({
        where: { id: shortsId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      // 扣除用户积分（如果不是上传者）
      if (pointsToDeduct > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            points: {
              decrement: pointsToDeduct,
            },
          },
        });
      }

      // 创建订单
      const order = await tx.shortsOrder.create({
        data: orderToCreate,
      });

      return order;
    });

    return ResponseUtil.success({
      success: true,
      orderId: result.id,
      message: '购买成功',
    });

  } catch (error) {
    console.error('创建订单失败:', error);
    return ResponseUtil.error(error instanceof Error ? error.message : '创建订单失败');
  }
} 