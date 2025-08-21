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
    const currentChapter = await prisma.courseChapter.findUnique({
      where: {
        id: Number(chapterId),
        courseId: Number(id),
      },
      select: {
        parentId: true,
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



    // 增加课程浏览量
    await prisma.course.update({
      where: { id: Number(id) },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // 先检查课程是否支持一次性支付
    const course = await prisma.course.findUnique({
      where: { id: Number(id) },
      select: {
        oneTimePayment: true,
        oneTimePoint: true,
      },
    });

    // 先检查是否是一次性购买整个课程
    const oneTimeOrder = await prisma.courseOrder.findFirst({
      where: {
        userId: userData.user.id,
        courseId: Number(id),
        oneTimePayment: true, // 一次性支付订单
      },
    });

    if (oneTimeOrder) {
      // 如果是一次性购买，获取章节信息
      const chapter = await prisma.courseChapter.findUnique({
        where: {
          id: Number(chapterId),
          courseId: Number(id),
        },
        select: {
          videoUrl: true,
        },
      });

      return ResponseUtil.success({
        ...oneTimeOrder,
        videoUrl: chapter?.videoUrl,
        hasPurchased: true,
        isOneTimePayment: true, // 标记为一次性支付
      });
    }

    // 检查父章节的总积分设置
    if (currentChapter?.parentId) {
   
      // 如果有父章节，检查父章节的总积分设置
      const parentChapter = await prisma.courseChapter.findUnique({
        where: {
          id: currentChapter.parentId,
          courseId: Number(id),
        },
        select: {
          id: true,
          totalPoints: true,
          selectTotalPoints: true,
        },
      });
  
      // 如果父章节设置了总积分且大于0
      if (parentChapter?.selectTotalPoints && parentChapter.totalPoints && parentChapter.totalPoints > 0) {
        // 检查是否有父章节的订单记录
        const parentOrder = await prisma.courseOrder.findFirst({
          where: {
            userId: userData.user.id,
            courseId: Number(id),
            chapterId: parentChapter.id,
          },
        });
        console.log(parentOrder,parentChapter,'parentOrder222')
        console.log(33333,parentChapter)

       
        if (parentOrder) {
          // 如果有父章节订单，返回订单和当前章节的URL
          return ResponseUtil.success({
            ...parentOrder,
            videoUrl: currentChapter.videoUrl,
            hasPurchased: true,
          });
        }else{
          // 如果父章节设置了总积分但未购买，返回相关信息
          if (parentChapter?.selectTotalPoints && parentChapter.totalPoints && parentChapter.totalPoints > 0) {
            return ResponseUtil.success({
              hasPurchased: false,
              isParentChapterPayment: true,
              parentChapterId: parentChapter.id,
              totalPoints: parentChapter.totalPoints,
              message: `该章节需要购买父章节，需要 ${parentChapter.totalPoints} 积分`
            });
          }
          return ResponseUtil.success(null);
        }
      }

      
    }
  

    // 如果没有一次性购买，检查是否有该章节的单独订单
    const chapterOrder = await prisma.courseOrder.findFirst({
      where: {
        userId: userData.user.id,
        courseId: Number(id),
        chapterId: Number(chapterId),
      },
    });

    if (chapterOrder) {
      // 如果找到章节订单，获取章节信息
      const chapter = await prisma.courseChapter.findUnique({
        where: {
          id: Number(chapterId),
          courseId: Number(id),
        },
        select: {
          videoUrl: true,
        },
      });

      return ResponseUtil.success({
        ...chapterOrder,
        videoUrl: chapter?.videoUrl,
        hasPurchased: true,
      });
    }

    // 如果课程支持一次性支付，返回相关信息
    if (course?.oneTimePayment && course.oneTimePoint && course.oneTimePoint > 0) {
      return ResponseUtil.success({
        hasPurchased: false,
        isOneTimePayment: true,
        oneTimePoint: course.oneTimePoint,
        message: `该课程支持一次性支付，需要 ${course.oneTimePoint} 积分购买整个课程`
      });
    }

    // 如果章节需要积分，返回章节信息
    if (currentChapter.points > 0) {
      return ResponseUtil.success({
        hasPurchased: false,
        chapterPoints: currentChapter.points,
        message: `该章节需要 ${currentChapter.points} 积分`
      });
    }

    return ResponseUtil.success(null);
  } catch (error) {
    console.error('查询课程章节订单失败:', error);
    return ResponseUtil.serverError('查询订单失败');
  }
}

// 创建订单
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user) {
      return ResponseUtil.unauthorized('未登录');
    }

    const { id, chapterId } = await params;
    const courseId = parseInt(id);

    // 先获取必要的数据，避免在事务中执行过多查询
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        oneTimePayment: true,
        oneTimePoint: true,
        uploaderId: true, // 添加课程上传者ID
      },
    });

    const chapter = await prisma.courseChapter.findUnique({
      where: {
        id: parseInt(chapterId),
        courseId,
      },
      include: {
        parent: {
          select: {
            id: true,
            totalPoints: true,
            selectTotalPoints: true,
          },
        },
      },
    });

    if (!chapter) {
      throw new Error('章节不存在');
    }

    // 检查用户积分
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { points: true },
    });

    if (!currentUser) {
      throw new Error('用户不存在');
    }

    let orderToCreate: any = {};
    let pointsToDeduct = 0;
    let targetChapterId: number | null = null;
    
    // 检查用户是否为课程上传者
    const isUploader = course?.uploaderId === user.id;

    // 检查是否是一次性支付课程
    if (course?.oneTimePayment && course.oneTimePoint && course.oneTimePoint > 0) {
      // 一次性支付课程，检查是否已购买整个课程
      const existingCourseOrder = await prisma.courseOrder.findFirst({
        where: {
          userId: user.id,
          courseId,
          oneTimePayment: true,
          chapterId: null,
        },
      });

      if (existingCourseOrder) {
        // 已购买整个课程，直接返回
        return ResponseUtil.success({
          ...existingCourseOrder,
          videoUrl: chapter.videoUrl,
        });
      }

      // 如果是上传者，不需要检查积分和扣除积分
      if (!isUploader && currentUser.points < course.oneTimePoint) {
        throw new Error(`积分不足，需要 ${course.oneTimePoint} 积分购买整个课程`);
      }

      // 创建整个课程的订单
      orderToCreate = {
        userId: user.id,
        courseId,
        chapterId: null, // 整个课程的订单
        points: isUploader ? 0 : course.oneTimePoint, // 上传者积分为0
        oneTimePayment: true,
        oneTimePoint: course.oneTimePoint,
      };
      pointsToDeduct = isUploader ? 0 : course.oneTimePoint; // 上传者不扣除积分
      targetChapterId = null;
    } else if (chapter.parentId && chapter.parent?.totalPoints && chapter.parent.totalPoints > 0) {
      // 子章节，且父章节设置了totalPoints
      // 检查是否已购买父章节
      const existingParentOrder = await prisma.courseOrder.findFirst({
        where: {
          userId: user.id,
          courseId,
          chapterId: chapter.parentId,
        },
      });

      if (existingParentOrder) {
        // 已购买父章节，直接返回
        return ResponseUtil.success({
          ...existingParentOrder,
          videoUrl: chapter.videoUrl,
        });
      }

      // 如果是上传者，不需要检查积分和扣除积分
      if (!isUploader && currentUser.points < chapter.parent.totalPoints) {
        throw new Error(`积分不足，需要 ${chapter.parent.totalPoints} 积分购买整个章节`);
      }

      // 创建父章节的订单
      orderToCreate = {
        userId: user.id,
        courseId,
        chapterId: chapter.parentId,
        points: isUploader ? 0 : chapter.parent.totalPoints, // 上传者积分为0
      };
      pointsToDeduct = isUploader ? 0 : chapter.parent.totalPoints; // 上传者不扣除积分
      targetChapterId = chapter.parentId;
    } else {
      // 普通子章节，按章节单独计费
      // 如果是上传者，不需要检查积分
      if (!isUploader && currentUser.points < chapter.points) {
        throw new Error('积分不足');
      }

      // 检查是否已经购买过该章节
      const existingOrder = await prisma.courseOrder.findFirst({
        where: {
          userId: user.id,
          courseId,
          chapterId: parseInt(chapterId),
        },
      });

      if (existingOrder) {
        return ResponseUtil.success({
          ...existingOrder,
          videoUrl: chapter.videoUrl,
        });
      }

      // 创建子章节订单
      orderToCreate = {
        userId: user.id,
        courseId,
        chapterId: parseInt(chapterId),
        points: isUploader ? 0 : chapter.points, // 上传者积分为0
      };
      pointsToDeduct = isUploader ? 0 : chapter.points; // 上传者不扣除积分
      targetChapterId = parseInt(chapterId);
    }

    // 开启事务，只处理核心的积分扣除和订单创建
    const result = await prisma.$transaction(async (tx) => {
      // 增加课程浏览量
      await tx.course.update({
        where: { id: courseId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      // 扣除用户积分（上传者不扣除）
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
      const order = await tx.courseOrder.create({
        data: orderToCreate,
      });

      return {
        ...order,
        videoUrl: chapter.videoUrl,
      };
    }, {
      timeout: 10000, // 10秒超时
      maxWait: 5000,  // 最大等待时间5秒
    });

    return ResponseUtil.success(result);
  } catch (error: any) {
    console.error('创建章节订单失败:', error);
    return ResponseUtil.error(error.message || '创建订单失败');
  }
} 