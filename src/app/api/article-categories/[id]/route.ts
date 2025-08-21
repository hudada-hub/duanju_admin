import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
// 获取单个分类
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await prisma.articleCategory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!category) {
      return NextResponse.json(
        { 
          code: 404,
          message: '分类不存在',
          data: null
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: '获取成功',
      data: category,
    });
  } catch (error) {
    console.error('获取分类失败:', error);
    return NextResponse.json(
      { 
        code: 500,
        message: '获取分类失败',
        data: null
      } ,
      { status: 500 }
    );
  }
}

// 更新分类
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 检查分类是否存在
    const category = await prisma.articleCategory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!category) {
      return NextResponse.json(
        { 
          code: 404,
          message: '分类不存在',
          data: null
        },
        { status: 404 }
      );
    }

    // 更新分类
    const updatedCategory = await prisma.articleCategory.update({
      where: { id: category.id },
      data: body
    });

    return NextResponse.json({
      code: 0,
      message: '更新成功',
      data: updatedCategory,
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    return NextResponse.json(
      { 
        code: 500,
        message: '更新分类失败',
        data: null
      } ,
      { status: 500 }
    );
  }
}

// 删除分类
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 检查分类是否存在
    const category = await prisma.articleCategory.findUnique({
      where: { id: parseInt(id) },
      include: {
        articles: true
      }
    });

    if (!category) {
      return NextResponse.json(
        { 
          code: 404,
          message: '分类不存在',
          data: null
        },
        { status: 404 }
      );
    }

    // 检查是否有关联的文章
    if (category.articles && category.articles.length > 0) {
      return NextResponse.json(
        { 
          code: 400,
          message: '该分类下还有文章，无法删除',
          data: null
        },
        { status: 400 }
      );
    }

    // 删除分类
    await prisma.articleCategory.delete({
      where: { id: category.id }
    });

    return NextResponse.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json(
      { 
        code: 500,
        message: '删除分类失败',
        data: null
      } ,
      { status: 500 }
    );
  }
}