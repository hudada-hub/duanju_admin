import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
// 获取文章详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: number }> }
) {
  try {
    const { id } = await params;
    const article = await prisma.article.findUnique({
      where: { id: Number(id) },
      include: {
        category: true
      }
    });

    if (!article) {
      return NextResponse.json({
        code: 404,
        message: '文章不存在',
        data: null,
      }, { status: 404 });
    }

    // 增加浏览次数
    await prisma.article.update({
      where: { id: article.id },
      data: {
        viewCount: { increment: 1 }
      }
    });

    return NextResponse.json({
      code: 0,
      message: '获取成功',
      data: article,
    });
  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json({
      code: 1,
      message: '获取文章失败',
      data: null,
    } , { status: 500 });
  }
}

// 更新文章
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { title, categoryId, content, summary, status, tags } = body;

      const {id} = await params;
    // 检查文章是否存在
    const article = await prisma.article.findUnique({
      where: { id: Number(id) }
    });

    if (!article) {
      return NextResponse.json({
        code: 404,
        message: '文章不存在',
        data: null,
      }, { status: 404 });
    }

    // 更新文章
    await prisma.article.update({
      where: { id: article.id },
      data: {
        title,
        categoryId,
        content,
        summary,
        status,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      code: 0,
      message: '更新成功',
      data: null,
    });
  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json({
      code: 1,
      message: '更新文章失败',
      data: null,
    } , { status: 500 });
  }
}

// 删除文章
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 检查文章是否存在
    const article = await prisma.article.findUnique({
      where: { id: Number(id) }
    });

    if (!article) {
      return NextResponse.json({
        code: 404,
        message: '文章不存在',
        data: null,
      }, { status: 404 });
    }

    // 删除文章
    await prisma.article.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json({
      code: 1,
      message: '删除文章失败',
      data: null,
    } , { status: 500 });
  }
}