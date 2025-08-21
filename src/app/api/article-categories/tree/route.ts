import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
export async function GET() {
  try {
    // 一次性获取所有分类数据，包含父分类和子分类关系
    const allCategories = await prisma.articleCategory.findMany({
      include: {
        parent: true,
        children: true
      },
      orderBy: {
        name: 'asc' // 按名称排序
      }
    });

    // 使用Map提高查找效率
    const categoryMap = new Map<number | null, any[]>();
    allCategories.forEach(category => {
      if (!categoryMap.has(category.parentId)) {
        categoryMap.set(category.parentId, []);
      }
      categoryMap.get(category.parentId)?.push(category);
    });

    // 递归构建树状结构
// 为 buildTree 函数添加返回类型批注，根据代码逻辑，返回值为包含文章分类对象的数组
    const buildTree = (parentId: number | null): { [key: string]: any }[] => {
      const nodes = categoryMap.get(parentId) || [];
      return nodes.map(node => ({
        ...node,
        children: buildTree(node.id)
      }));
    };

    const categories = buildTree(null);

    return NextResponse.json({
      code: 0,
      message: '获取成功',
      data: categories,
    });
  } catch (error) {
    console.error('获取分类树失败:', error);
    return NextResponse.json({
      code: 1,
      message: '获取分类树失败',
      data: null,
    } , { status: 500 });
  }
}