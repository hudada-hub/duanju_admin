import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
// 获取分类列表
export async function GET() {
  try {
    const categories = await prisma.articleCategory.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      code: 0,
      message: '获取成功',
      data: categories,
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return NextResponse.json(
      { 
        code: 500,
        message: '获取分类列表失败',
        data: null
      } ,
      { status: 500 }
    );
  }
}

// 创建新分类
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(body,'body');
    
    const category = await prisma.articleCategory.create({
      data: body
    });

    return NextResponse.json({
      code: 0,
      message: '创建成功',
      data: category,
    }, { status: 201 });
  } catch (error) {
    console.error('创建分类失败:', error);
    return NextResponse.json(
      { 
        code: 500,
        message: '创建分类失败: ' + (error instanceof Error ? error.message : String(error)),
        data: null
      } ,
      { status: 500 }
    );
  }
}