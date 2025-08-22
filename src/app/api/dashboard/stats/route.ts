import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { ResponseUtil } from '@/utils/response';

export async function GET() {
  try {
    const today = dayjs().startOf('day').toDate();
    const sevenDaysAgo = dayjs().subtract(6, 'day').startOf('day').toDate();
    const monthAgo = dayjs().subtract(30, 'day').startOf('day').toDate();

    // 用户相关统计
    const [
      userCount,
      todayActiveUsers,
      todayNewUsers,
      monthNewUsers,
      previousUserCount
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),
      // 今日活跃用户
      prisma.user.count({
        where: { lastLoginAt: { gte: today } }
      }),
      // 今日新注册
      prisma.user.count({
        where: { createdAt: { gte: today } }
      }),
      // 本月新注册用户
      prisma.user.count({
        where: { createdAt: { gte: monthAgo } }
      }),
      // 7天前用户数（用于计算增长率）
      prisma.user.count({
        where: { createdAt: { lt: sevenDaysAgo } }
      })
    ]);

    // 文章相关统计
    const [
      articleCount,
      todayArticles
    ] = await Promise.all([
      // 文章总数
      prisma.article.count({
        where: { status: 'PUBLISHED' }
      }),
      // 今日发布文章
      prisma.article.count({
        where: { 
          status: 'PUBLISHED',
          createdAt: { gte: today }
        }
      })
    ]);

    // 短剧相关统计
    const [
      shortsCount,
      todayShorts,
      totalChapters,
      totalDuration
    ] = await Promise.all([
      // 短剧总数
      prisma.short.count({
        where: { isDeleted: false }
      }),
      // 今日新增短剧
      prisma.short.count({
        where: { 
          isDeleted: false,
          createdAt: { gte: today }
        }
      }),
      // 总章节数
      prisma.shortsChapter.count({
        where: { 
          duration: { not: null }
        }
      }),
      // 总时长（分钟）
      prisma.shortsChapter.aggregate({
        where: { 
          duration: { not: null }
        },
        _sum: { duration: true }
      })
    ]);

    // 订单相关统计
    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      completedOrders
    ] = await Promise.all([
      // 总订单数
      prisma.order.count(),
      // 今日订单数
      prisma.order.count({
        where: { createdAt: { gte: today } }
      }),
      // 待处理订单数
      prisma.order.count({
        where: { status: 'PENDING' }
      }),
      // 已完成订单数
      prisma.order.count({
        where: { status: 'PAID' }
      })
    ]);



    // 财务相关统计
    const [
      todayIncome,
      monthIncome,
      totalIncome
    ] = await Promise.all([
      // 今日收入
      prisma.order.aggregate({
        where: {
          status: 'PAID',
          createdAt: { gte: today }
        },
        _sum: { amount: true }
      }),
      // 本月收入
      prisma.order.aggregate({
        where: {
          status: 'PAID',
          createdAt: { gte: monthAgo }
        },
        _sum: { amount: true }
      }),
      // 总收入
      prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true }
      })
    ]);

    // 计算用户增长率
    const userGrowth = previousUserCount ? ((userCount - previousUserCount) / previousUserCount) * 100 : 0;

    return ResponseUtil.success({
      stats: [
        // 用户相关统计
        {
          name: '总用户数',
          value: userCount,
          change: Math.round(userGrowth * 100) / 100,
          trend: userGrowth > 0 ? 'up' : userGrowth < 0 ? 'down' : 'neutral'
        },
        {
          name: '今日活跃',
          value: todayActiveUsers,
          change: 0,
          trend: 'up'
        },
        {
          name: '今日注册',
          value: todayNewUsers,
          change: 0,
          trend: 'up'
        },
        {
          name: '本月新增',
          value: monthNewUsers,
          change: 0,
          trend: 'up'
        },
        // 内容相关统计
        {
          name: '文章总数',
          value: articleCount,
          change: 0,
          trend: 'up'
        },
        {
          name: '今日文章',
          value: todayArticles,
          change: 0,
          trend: 'up'
        },
        {
          name: '短剧总数',
          value: shortsCount,
          change: 0,
          trend: 'up'
        },
        {
          name: '今日短剧',
          value: todayShorts,
          change: 0,
          trend: 'up'
        },
        {
          name: '总章节数',
          value: totalChapters,
          change: 0,
          trend: 'up'
        },
        {
          name: '总时长(分钟)',
          value: Math.round((totalDuration._sum.duration || 0) / 60),
          change: 0,
          trend: 'up'
        },
        // 订单相关统计
        {
          name: '总订单数',
          value: totalOrders,
          change: 0,
          trend: 'up'
        },
        {
          name: '今日订单',
          value: todayOrders,
          change: 0,
          trend: 'up'
        },
        {
          name: '待处理订单',
          value: pendingOrders,
          change: 0,
          trend: 'neutral'
        },
        {
          name: '已完成订单',
          value: completedOrders,
          change: 0,
          trend: 'up'
        },
        // 财务相关统计
        {
          name: '今日收入',
          value: Math.round((todayIncome._sum?.amount || 0) / 100),
          change: 0,
          trend: 'up'
        },
        {
          name: '本月收入',
          value: Math.round((monthIncome._sum?.amount || 0) / 100),
          change: 0,
          trend: 'up'
        },
        {
          name: '总收入',
          value: Math.round((totalIncome._sum?.amount || 0) / 100),
          change: 0,
          trend: 'up'
        }
      ]
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return ResponseUtil.serverError('获取统计数据失败');
  } 
}