import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { ShortStatus } from '@prisma/client';
import { verifyAuth } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const directionId = searchParams.get('directionId');
    const keyword = searchParams.get('keyword');
    const sort = searchParams.get('sort') || 'latest';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '12');

    // 构建查询条件
    const where = {
      isDeleted: false,
      isHidden: false,
      ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
      ...(directionId ? { directionId: parseInt(directionId) } : {}),
      // 关键词搜索 - 支持标题、描述、讲师字段的模糊搜索
      ...(keyword ? {
        OR: [
          {
            title: {
              contains: keyword,
            },
          },
          {
            description: {
              contains: keyword,
            },
          },
          {
            summary: {
              contains: keyword,
            },
          },
          {
            instructor: {
              contains: keyword,
            },
          },
        ],
      } : {}),
    };

    // 构建排序条件
    let orderBy: any = {};
    switch (sort) {
      case 'latest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'hot':
      case 'viewCount':
        orderBy = { viewCount: 'desc' };
        break;
      case 'like':
        orderBy = { likeCount: 'desc' };
        break;
      case 'duration':
        orderBy = { totalDuration: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // 获取总数
    const total = await prisma.short.count({ where });

    // 获取分页数据
    const shorts = await prisma.short.findMany({
      where,
      orderBy,
      include: {
        category: {
          select: {
            name: true,
          },
        },
        direction: {
          select: {
            name: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 为每个短剧添加学习人数统计
    const shortsWithStudentCount = await Promise.all(
      shorts.map(async (short) => {
        try {
          const uniqueUsers = await prisma.shortsOrder.groupBy({
            by: ['userId'],
          where: {
            shortsId: short.id,
          },
        });
        
        return {
          ...short,
          studentCount: uniqueUsers.length,
        };
        } catch (error) {
          console.error(`获取短剧 ${short.id} 学生数失败:`, error);
          return {
            ...short,
            studentCount: 0,
          };
        }
      })
    );
    
    return ResponseUtil.success({
      list: shortsWithStudentCount,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('获取短剧列表失败:', error);
    console.error('错误详情:', {
      message: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return ResponseUtil.error('获取短剧列表失败');
  }
}