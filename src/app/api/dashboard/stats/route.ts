import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { ResponseUtil } from '@/utils/response';

export async function GET() {
  try {
    const today = dayjs().startOf('day').toDate();
    const sevenDaysAgo = dayjs().subtract(6, 'day').startOf('day').toDate();

    // 用户相关统计
    const [
      userCount,
      todayActiveUsers,
      todayNewUsers,
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
      // 7天前用户数（用于计算增长率）
      prisma.user.count({
        where: { createdAt: { lt: sevenDaysAgo } }
      })
    ]);

    // 文章相关统计
    const [
      articleCount,
      articleCommentCount
    ] = await Promise.all([
      // 文章总数
      prisma.article.count({
        where: { status: 'PUBLISHED' }
      }),
      // 文章评论总数
      prisma.articleComment.count()
    ]);

    // 短剧相关统计
    const [
      courseCount,
      courseOrderCount,
      todayStudyCount
    ] = await Promise.all([
      // 短剧总数
      prisma.course.count(),
      // 短剧订单总数
      prisma.courseOrder.count(),
      // 今日学习人数（通过短剧订单更新时间统计）
      prisma.courseOrder.count({
        where: { updatedAt: { gte: today } }
      })
    ]);

    // 论坛相关统计
    const [
      postCount,
      todayPostCount
    ] = await Promise.all([
      // 帖子总数
      prisma.forumPost.count({
        where: { status: 'PUBLISHED' }
      }),
      // 今日发帖数
      prisma.forumPost.count({
        where: {
          status: 'PUBLISHED',
          createdAt: { gte: today }
        }
      })
    ]);

    // 任务相关统计
    const [
      taskCount,
      todaySettledTasks
    ] = await Promise.all([
      // 任务总数
      prisma.task.count(),
      // 今日可结算任务数（已完成状态的任务）
      prisma.task.count({
        where: { 
          status: 'COMPLETED',
          updatedAt: { gte: today }
        }
      })
    ]);

    // 财务相关统计
    const [
      todayRecharge,
      todayIncome
    ] = await Promise.all([
      // 今日充值金额（通过订单表的充值类型统计）
      prisma.order.aggregate({
        where: {
          type: 'RECHARGE',
          status: 'PAID',
          createdAt: { gte: today }
        },
        _sum: { amount: true }
      }),
      // 今日收入（所有已支付订单）
      prisma.order.aggregate({
        where: {
          status: 'PAID',
          createdAt: { gte: today }
        },
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
          change: 0 ,
          trend: 0
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
        // 文章相关统计
        {
          name: '文章总数',
          value: articleCount,
          change: 0,
          trend: 'up'
        },
        {
          name: '文章评论',
          value: articleCommentCount,
          change: 0,
          trend: 'up'
        },
        // 短剧相关统计
        {
          name: '短剧总数',
          value: courseCount,
          change: 0,
          trend: 'up'
        },
        {
          name: '短剧订单',
          value: courseOrderCount,
          change: 0,
          trend: 'up'
        },
        {
          name: '今日学习',
          value: todayStudyCount,
          change: 0,
          trend: 'up'
        },
        // 论坛相关统计
        {
          name: '帖子总数',
          value: postCount,
          change: 0,
          trend: 'up'
        },
        {
          name: '今日发帖',
          value: todayPostCount,
          change: 0,
          trend: 'up'
        },
        // 任务相关统计
        {
          name: '任务总数',
          value: taskCount,
          change: 0,
          trend: 'up'
        },
        {
          name: '今日可结算任务',
          value: todaySettledTasks,
          change: 0,
          trend: 'up'
        },
        // 财务相关统计
        {
          name: '今日充值',
          value: Math.round((todayRecharge._sum.amount?.toNumber() || 0) / 100),
          change: 0,
          trend: 'up'
        },
        {
          name: '今日收入',
          value: todayIncome._sum.amount?.toNumber() || 0,
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