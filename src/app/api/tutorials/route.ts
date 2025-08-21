import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
// 获取教程列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = Number(searchParams.get('parentId')) || 1; // 默认获取父ID为1的分类

    // 获取所有启用的子分类及其文章
    const categories = await prisma.articleCategory.findMany({
      where: {
        parentId: parentId,
        isEnabled: true
      },
      orderBy: {
        sort: 'asc'
      },
      include: {
        articles: {
          where: {
            status: 'PUBLISHED'
          },
          select: {
            id: true,
            title: true,
            summary: true,
            createdAt: true,
            updatedAt: true,
            viewCount: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: categories
    });
  } catch (error) {
    console.error('获取教程列表失败:', error);
    return NextResponse.json({
      code: 1,
      message: '获取教程列表失败',
      data: null
    } , { status: 500 });
  }
} 