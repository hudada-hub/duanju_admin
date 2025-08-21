import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ResponseUtil } from '@/utils/response';

// 获取短剧评论列表
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userId, 
      courseId,
      chapterId,
      parentId,
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
    if (chapterId !== undefined) {
      if (chapterId === null) {
        where.chapterId = null;
      } else {
        where.chapterId = Number(chapterId);
      }
    }
    if (parentId !== undefined) {
      if (parentId === null) {
        where.parentId = null;
      } else {
        where.parentId = Number(parentId);
      }
    }

    // 获取总数
    const total = await prisma.courseComment.count({ where });

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);
    
    // 确保页码不超过总页数
    const currentPage = Math.min(page, Math.max(1, totalPages));
    
    // 计算跳过的记录数
    const skip = (currentPage - 1) * pageSize;

    // 获取分页数据
    const comments = await prisma.courseComment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                nickname: true
              }
            }
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
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
      items: comments,
      total,
      page: currentPage,
      pageSize,
      totalPages
    });
  } catch (error) {
    console.error('获取短剧评论列表失败:', error);
    return ResponseUtil.serverError('获取短剧评论列表失败');
  } 
}

// 删除短剧评论
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');

    if (!id && !ids) {
      return ResponseUtil.error('请提供评论ID');
    }

    let commentIds: number[] = [];

    if (id) {
      // 单个删除
      commentIds = [Number(id)];
    } else if (ids) {
      // 批量删除
      commentIds = JSON.parse(ids);
    }

    if (commentIds.length === 0) {
      return ResponseUtil.error('请提供有效的评论ID');
    }

    // 删除评论及其所有回复
    await prisma.courseComment.deleteMany({
      where: {
        OR: [
          { id: { in: commentIds } },
          { parentId: { in: commentIds } }
        ]
      }
    });

    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    console.error('删除短剧评论失败:', error);
    return ResponseUtil.serverError('删除短剧评论失败');
  } 
} 