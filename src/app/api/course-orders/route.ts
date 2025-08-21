import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ResponseUtil } from '@/utils/response';

// 获取短剧订单列表
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userId, 
      courseId,
      chapterId,
      page: rawPage,
      pageSize: rawPageSize
    } = body;

    // 确保分页参数是有效的数字
    const page = Math.max(1, Number(rawPage) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(rawPageSize) || 10));

    // 构建查询条件
    const where: any = {};
    if (userId) where.userId = Number(userId);
    if (courseId) where.courseId = Number(courseId);
    if (chapterId) where.chapterId = Number(chapterId);

    // 获取总数
    const total = await prisma.courseOrder.count({ where });

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);
    
    // 确保页码不超过总页数
    const currentPage = Math.min(page, Math.max(1, totalPages));
    
    // 计算跳过的记录数
    const skip = (currentPage - 1) * pageSize;

    // 获取分页数据
    const orders = await prisma.courseOrder.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            phone: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            coverUrl: true
          }
        },
        chapter: {
          select: {
            id: true,
            title: true,
            duration: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize
    });

    return ResponseUtil.success({
      items: orders,
      total,
      page: currentPage,
      pageSize,
      totalPages
    });
  } catch (error) {
    console.error('获取短剧订单列表失败:', error);
    return ResponseUtil.serverError('获取短剧订单列表失败');
  } 
}

// 获取订单统计信息
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'stats') {
      // 获取统计信息
      const [
        totalOrders,
        totalPoints,
        totalProgress,
        todayOrders
      ] = await Promise.all([
        // 总订单数
        prisma.courseOrder.count(),
        // 总消费积分
        prisma.courseOrder.aggregate({
          _sum: {
            points: true
          }
        }),
        // 平均学习进度
        prisma.courseOrder.aggregate({
          _avg: {
            progress: true
          }
        }),
        // 今日订单数
        prisma.courseOrder.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]);

      return ResponseUtil.success({
        totalOrders,
        totalPoints: totalPoints._sum.points || 0,
        averageProgress: totalProgress._avg.progress || 0,
        todayOrders
      });
    }

    return ResponseUtil.error('无效的请求类型');
  } catch (error) {
    console.error('获取订单统计失败:', error);
    return ResponseUtil.serverError('获取订单统计失败');
  } 
} 