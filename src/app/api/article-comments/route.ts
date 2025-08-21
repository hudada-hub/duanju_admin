import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ResponseUtil } from '@/utils/response';

// 获取评论列表
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      isActive, 
      isDeleted, 
      userId, 
      articleId,
      page: rawPage,
      pageSize: rawPageSize
    } = body;

    // 确保分页参数是有效的数字
    const page = Math.max(1, Number(rawPage) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(rawPageSize) || 10));

    // 构建查询条件
    const where: any = {};
    if (isActive !== undefined) where.isActive = Boolean(isActive);
    if (isDeleted !== undefined) where.isDeleted = Boolean(isDeleted);
    if (userId) where.userId = Number(userId);
    if (articleId) where.articleId = Number(articleId);

    // 获取总数
    const total = await prisma.articleComment.count({ where });

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);
    
    // 确保页码不超过总页数
    const currentPage = Math.min(page, Math.max(1, totalPages));
    
    // 计算跳过的记录数
    const skip = (currentPage - 1) * pageSize;

    // 获取分页数据
    const comments = await prisma.articleComment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        article: {
          select: {
            id: true,
            title: true
          }
        },
        parentComment: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                nickname: true
              }
            }
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
    console.error('获取评论列表失败:', error);
    return ResponseUtil.serverError('获取评论列表失败');
  } 
}

// 批量更新评论状态
export async function PUT(request: Request) {
  try {
    const { ids, isActive, isDeleted } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return ResponseUtil.error('请选择要操作的评论');
    }

    await prisma.articleComment.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(isDeleted !== undefined && { isDeleted })
      }
    });

    return ResponseUtil.success(null, '更新成功');
  } catch (error) {
    console.error('更新评论状态失败:', error);
    return ResponseUtil.serverError('更新评论状态失败');
  } 
} 