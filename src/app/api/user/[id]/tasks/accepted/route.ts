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

    // 获取用户接受的任务
    const taskApplications = await prisma.taskApplication.findMany({
      where: {
        applicantId: userId,
        task: {
          status: { in: ['IN_PROGRESS', 'COMPLETED', 'ADMIN_CONFIRMED', 'ADMIN_REJECTED', 'PUBLISHER_REJECTED'] } // 执行中、已完成、管理员已确认、被拒绝的任务
        }
      },
      select: {
        id: true,
        createdAt: true,
        task: {
          select: {
            id: true,
            title: true,
            content: true,
            points: true,
            status: true,
            rejectReason: true,
            createdAt: true,
            category: {
              select: {
                id: true,
                name: true
              }
            },
            author: {
              select: {
                id: true,
                nickname: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 格式化数据
    const formattedTasks = taskApplications.map(application => ({
      id: application.task.id,
      title: application.task.title,
      description: application.task.content,
      points: application.task.points,
      status: application.task.status,
      rejectReason: application.task.rejectReason,
      applicationStatus: 'ACCEPTED', // 用户已接受的任务
      createdAt: application.task.createdAt.toISOString(),
      acceptedAt: application.createdAt.toISOString(),
      categoryName: application.task.category.name,
      authorName: application.task.author.nickname
    }));

    return ResponseUtil.success({
      list: formattedTasks,
      total: formattedTasks.length
    });

  } catch (error) {
    console.error('获取用户接受任务失败:', error);
    return ResponseUtil.error('获取用户接受任务失败');
  }
} 