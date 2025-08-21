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

    // 获取用户发布的任务
    const tasks = await prisma.task.findMany({
      where: {
        authorId: userId,
        isDeleted: false
      },
      select: {
        id: true,
        title: true,
        content: true,
        points: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            applications: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 格式化数据
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.content,
      points: task.points,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      categoryName: task.category.name,
      applicationCount: task._count.applications,
      commentCount: task._count.comments
    }));

    return ResponseUtil.success({
      list: formattedTasks,
      total: formattedTasks.length
    });

  } catch (error) {
    console.error('获取用户发布任务失败:', error);
    return ResponseUtil.error('获取用户发布任务失败');
  }
} 