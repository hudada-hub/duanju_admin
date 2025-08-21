import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 记录学习进度的函数
async function recordLearningProgress(userId: number, courseId: number, chapterId: number, progress: number) {
  try {
    // 如果进度达到100%，不再记录
    if (progress >= 100) {
      return;
    }

    // 查找最近的记录
    const existingLog = await prisma.courseChapterLog.findFirst({
      where: {
        userId,
        courseId,
        chapterId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // 如果没有记录或进度有变化，则记录
    if (!existingLog || existingLog.progress !== progress) {
      await prisma.courseChapterLog.create({
        data: {
          userId,
          courseId,
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

    const courseId = parseInt((await params).id);
    
    // 从查询参数获取章节ID和进度
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const progress = searchParams.get('progress');
    
    // 如果提供了章节ID和进度，记录学习进度
    if (userId && chapterId && progress !== null) {
      const chapterIdNum = parseInt(chapterId);
      const progressNum = parseInt(progress);
      
      if (!isNaN(chapterIdNum) && !isNaN(progressNum)) {
        await recordLearningProgress(userId, courseId, chapterIdNum, progressNum);
      }
    }
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        isDeleted: false,
        isHidden: false,
      },
      include: {
        chapters: {
          where: {
            parentId: null,
          },
          orderBy: {
            sort: 'asc',
          },
          select: {
            id: true,
            title: true,
            description: true,
            points: true,
            totalPoints:true,
            duration: true,
            sort: true,
            coverUrl: true, 
            uploaderId: true, // 添加上传者ID
            children: {
              orderBy: {
                sort: 'asc',
              },
              select: {
                id: true,
                title: true,
                description: true,
                points: true,
                duration: true,
                sort: true,
                coverUrl: true,
                uploaderId: true, // 添加上传者ID
                // 添加进度字段，将在后续处理中填充
              },
            },
          },
        },
        // 包含点赞数据
        likes: {
          where: userId ? { userId } : undefined,
          take: userId ? 1 : 0,
        },
        _count: {
          select: {
            likes: true,
            favorites: true,
          },
        },
        // 包含收藏数据
        favorites: {
          where: userId ? { userId } : undefined,
          take: userId ? 1 : 0,
        },
        // 新增：包含分类信息
        category: true,
        // 新增：包含方向信息
        direction: true,
        // 新增：包含评价信息
        ratings: {
          select: {
            descriptionRating: true,
            valueRating: true,
            teachingRating: true,
          },
        },
        // 新增：包含上传者信息
        uploader: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    // 获取学习人数（从CourseOrder表查询unique用户数量）
    const uniqueUsers = await prisma.courseOrder.findMany({
      where: {
        courseId: courseId,
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });
    const studentCount = uniqueUsers.length;

    // 获取总章节数（只统计子章节，不包含父章节）
    const totalChapters = await prisma.courseChapter.count({
      where: {
        courseId: courseId,
        parentId: {
          not: null, // 只统计有父章节的子章节
        },
      },
    });

    // 获取已学习章节数（从CourseOrder表查询，需要用户ID）
    const learnedChapters = userId ? await prisma.courseOrder.count({
      where: {
        courseId: courseId,
        userId: userId,
      },
    }) : 0;

    // 计算评价平均分
    const averageRatings = course && course.ratings && course.ratings.length > 0 ? {
      descriptionRating: course.ratings.reduce((sum, r) => sum + r.descriptionRating, 0) / course.ratings.length,
      valueRating: course.ratings.reduce((sum, r) => sum + r.valueRating, 0) / course.ratings.length,
      teachingRating: course.ratings.reduce((sum, r) => sum + r.teachingRating, 0) / course.ratings.length,
    } : {
      descriptionRating: 5,
      valueRating: 5,
      teachingRating: 5,
    };

    // 判断课程是否免费（检查是否有需要积分的章节）
    const hasPaidChapters = await prisma.courseChapter.findFirst({
      where: {
        courseId: courseId,
        parentId: {
          not: null,
        },
        points: {
          gt: 0,
        },
      },
    });

    const isFree = !hasPaidChapters;

    // 获取课程所需积分（如果支持一次性支付，使用oneTimePoint，否则计算所有章节积分总和）
    let requiredPoints = 0;
    if (course?.oneTimePayment && course.oneTimePoint > 0) {
      requiredPoints = course.oneTimePoint;
    } else if (!isFree) {
      const totalPoints = await prisma.courseChapter.aggregate({
        where: {
          courseId: courseId,
          parentId: {
            not: null,
          },
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

    if (!course) {
      return ResponseUtil.error('课程不存在');
    }

    // 处理子章节的points字段：如果父章节设置了totalPoints，则将子章节的points设为父章节的totalPoints值
    // 如果父章节已被购买，则子章节的points变为0
    let processedChapters = course.chapters;
    if (course.chapters) {
      // 创建深拷贝避免修改原始数据
      processedChapters = JSON.parse(JSON.stringify(course.chapters));
      
      for (const parentChapter of processedChapters) {
        console.log('API Debug - 处理父章节:', parentChapter.id, 'totalPoints:', parentChapter.totalPoints, 'children:', parentChapter.children?.length);
        
        if (parentChapter.totalPoints && parentChapter.totalPoints > 0 && parentChapter.children) {
          // 检查父章节是否有订单记录
          let parentChapterPurchased = false;
          if (userId) {
            console.log('API Debug - 检查父章节购买状态，userId:', userId, 'courseId:', courseId, 'chapterId:', parentChapter.id);
            
            const parentOrder = await prisma.courseOrder.findFirst({
              where: {
                userId: userId,
                courseId: courseId,
                chapterId: parentChapter.id,
              },
            });
            
            console.log('API Debug - 父章节订单查询结果:', parentOrder);
            parentChapterPurchased = !!parentOrder;
            console.log('API Debug - 父章节是否已购买:', parentChapterPurchased);
            
            // 如果父章节已被购买，更新学习进度记录到100%
            if (parentChapterPurchased && parentOrder) {
              console.log('API Debug - 父章节已购买，开始处理子章节');
              // 更新父章节订单的进度到100%
              await prisma.courseOrder.update({
                where: {
                  id: parentOrder.id,
                },
                data: {
                  progress: 100,
                },
              });
              
              // 为所有子章节创建或更新学习进度记录
              for (const childChapter of parentChapter.children) {
                // 检查是否已有子章节的订单记录
                const childOrder = await prisma.courseOrder.findFirst({
                  where: {
                    userId: userId,
                    courseId: courseId,
                    chapterId: childChapter.id,
                  },
                });
                
                if (childOrder) {
                  // 如果已有记录，更新进度到100%
                  await prisma.courseOrder.update({
                    where: {
                      id: childOrder.id,
                    },
                    data: {
                      progress: 100,
                    },
                  });
                } else {
                  // 如果没有记录，创建新的订单记录，进度设为100%
                  await prisma.courseOrder.create({
                    data: {
                      userId: userId,
                      courseId: courseId,
                      chapterId: childChapter.id,
                      points: 0, // 已购买，积分为0
                      progress: 100,
                    },
                  });
                }
              }
            }
          } else {
            console.log('API Debug - userId不存在，跳过购买状态检查');
          }
          
          console.log('API Debug - 开始设置子章节points，parentChapterPurchased:', parentChapterPurchased);
          
          // 为每个子章节添加进度信息
          for (const childChapter of parentChapter.children) {
            // 设置points值
            if (parentChapterPurchased) {
              console.log('API Debug - 设置子章节', childChapter.id, 'points为0');
              childChapter.points = 0;
            } else {
              // 检查当前用户是否是课程或章节的上传者
              const isUploader = userId && (
                course.uploaderId === userId || 
                childChapter.uploaderId === userId
              );
              
              if (isUploader) {
                console.log('API Debug - 当前用户是上传者，设置子章节', childChapter.id, 'points为0');
                childChapter.points = 0;
              } else {
                console.log('API Debug - 设置子章节', childChapter.id, 'points为', parentChapter.totalPoints);
                childChapter.points = parentChapter.totalPoints!;
              }
            }
            
            // 获取子章节的学习进度
            if (userId) {
              const childOrder = await prisma.courseOrder.findFirst({
                where: {
                  userId: userId,
                  courseId: courseId,
                  chapterId: childChapter.id,
                },
                select: {
                  progress: true,
                },
              });
              
              // 添加进度字段
              (childChapter as any).progress = childOrder?.progress || 0;
            } else {
              (childChapter as any).progress = 0;
            }
          }
        } else {
          console.log('API Debug - 父章节不符合条件:', {
            hasTotalPoints: !!parentChapter.totalPoints,
            totalPointsValue: parentChapter.totalPoints,
            hasChildren: !!parentChapter.children,
            childrenCount: parentChapter.children?.length
          });
          
          // 为没有设置totalPoints的父章节的子章节也添加进度信息
          if (parentChapter.children && parentChapter.children.length > 0) {
            for (const childChapter of parentChapter.children) {
              // 检查当前用户是否是课程或章节的上传者
              const isUploader = userId && (
                course.uploaderId === userId || 
                childChapter.uploaderId === userId
              );
              
              // 如果是上传者，设置积分为0
              if (isUploader) {
                console.log('API Debug - 当前用户是上传者，设置子章节', childChapter.id, 'points为0');
                childChapter.points = 0;
              }
              
              // 获取子章节的学习进度
              if (userId) {
                const childOrder = await prisma.courseOrder.findFirst({
                  where: {
                    userId: userId,
                    courseId: courseId,
                    chapterId: childChapter.id,
                  },
                  select: {
                    progress: true,
                  },
                });
                
                // 添加进度字段
                (childChapter as any).progress = childOrder?.progress || 0;
              } else {
                (childChapter as any).progress = 0;
              }
            }
          }
        }
      }
    }

    // 转换响应数据格式
    const response = {
      ...course,
      // 使用处理后的章节数据（包含动态调整的points值）
      chapters: processedChapters,
      isLiked: course.likes.length > 0,
      isFavorited: course.favorites.length > 0,
      likeCount: course._count.likes,
      favoriteCount: course._count.favorites,
      // 使用新的统计数据
      studentCount: studentCount, // 从CourseChapterLog查询的学习人数
      totalChapters: totalChapters, // 总章节数（子章节）
      learnedChapters: learnedChapters, // 已学习章节数（从CourseOrder表查询）
      ratingScore: course.ratingScore, // 使用Course表中的ratingScore字段
      // 新增：分类名称
      categoryName: course.category?.name || '未分类',
      // 新增：方向名称
      directionName: course.direction?.name || '未分类',
      // 新增：评价平均分
      averageRatings,
      // 新增：是否免费
      isFree,
      // 新增：所需积分
      requiredPoints,
      // 新增：课程等级
      level: course.level,
      // 新增：总时长
      totalDuration: course.totalDuration,
      // 新增：总章节数
      episodeCount: course.episodeCount,
      // 新增：浏览量
      viewCount: course.viewCount,
      // 新增：讲师
      instructor: course.instructor,
      // 新增：一次性支付相关字段
      oneTimePayment: course.oneTimePayment,
      oneTimePoint: course.oneTimePoint,
      // 新增：上传者信息
      uploader: course.uploader,
      uploaderId: course.uploaderId,
      // 删除原始关联数据
      likes: undefined,
      favorites: undefined,
      _count: undefined,
      category: undefined,
      direction: undefined,
      ratings: undefined,
    };

    return ResponseUtil.success(response);
  } catch (error) {
    console.error('获取课程详情失败:', error);
    return ResponseUtil.error('获取课程详情失败');
  }
}

// 更新课程
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
    const courseId = parseInt(id);
    const data = await request.json();
    const {
      title,
      description,
      coverUrl,
      level,
      instructor,
      categoryId,
      directionId,
      targetAudience,
      courseGoals,
      oneTimePayment = false,
      oneTimePoint,
      courseware = null, // 添加课件字段
    } = data;

    // 检查课程是否存在且属于当前用户
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: courseId,
        uploaderId: user.id,
        isDeleted: false,
      },
    });

    if (!existingCourse) {
      return ResponseUtil.notFound('课程不存在或无权限修改');
    }

    // 更新课程
    const course = await prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        title,
        description,
        summary: description,
        coverUrl,
        level,
        instructor,
        categoryId: parseInt(categoryId),
        directionId: parseInt(directionId),
        targetAudience,
        courseGoals,
        oneTimePoint,
        oneTimePayment,
        courseware, // 添加课件数据
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

    return ResponseUtil.success(course);
  } catch (error) {
    console.error('更新课程失败:', error);
    return ResponseUtil.error('更新课程失败');
  }
}

// 删除课程
export async function DELETE(
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

    // 检查课程是否存在且属于当前用户
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: courseId,
        uploaderId: user.id,
        isDeleted: false,
      },
    });

    if (!existingCourse) {
      return ResponseUtil.notFound('课程不存在或无权限删除');
    }

    // 软删除课程（标记为已删除，而不是真正删除）
    await prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        isDeleted: true,
      },
    });

    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    console.error('删除课程失败:', error);
    return ResponseUtil.error('删除课程失败');
  }
} 