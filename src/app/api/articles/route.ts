import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/utils/server-auth';

// 获取文章列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');

    // 构建查询条件
    const where: any = {};
    if (title) {
      where.title = { contains: title };
    }
    if (status) {
      where.status = status;
    }
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    const articles = await prisma.article.findMany({
      where,
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      code: 0,
      message: '获取成功',
      data: articles,
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { 
        code: 500,
        message: '获取文章列表失败',
        data: null
      } ,
      { status: 500 }
    );
  }
}

// 创建新文章
export async function POST(request: Request) {
  try {
    // 验证用户身份
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({
        code: 401,
        message: '未登录或登录已过期',
        data: null
      }, { status: 401 });
    }

    const body = await request.json();
    
    // 验证必要字段
    if (!body.title || !body.content || !body.categoryId) {
      return NextResponse.json({
        code: 400,
        message: '缺少必要字段（标题、内容或分类ID）',
        data: null
      }, { status: 400 });
    }

    // 确保 categoryId 是数字类型
    const articleData = {
      ...body,
      categoryId: typeof body.categoryId === 'string' ? parseInt(body.categoryId) : body.categoryId,
      authorId: user.id // 使用 token 中的用户 ID
    };

    const article = await prisma.article.create({
      data: articleData,
      include: {
        category: true,
        author: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        }
      }
    });

    return NextResponse.json({
      code: 0,
      message: '创建成功',
      data: article,
    }, { status: 201 });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json(
      { 
        code: 500,
        message: '创建文章失败',
        data: null
      } ,
      { status: 500 }
    );
  }
}