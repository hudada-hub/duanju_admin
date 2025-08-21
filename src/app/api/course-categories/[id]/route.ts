import prisma from '@/lib/prisma';
import { NextRequest } from "next/server";
import { ResponseUtil } from "@/utils/response";

// 更新短剧分类
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return ResponseUtil.error('分类名称不能为空');
    }

    const category = await prisma.courseCategory.update({
      where: { id: parseInt(id) },
      data: { name }
    });

    return ResponseUtil.success(category);
  } catch (error) {
    return ResponseUtil.error('更新短剧分类失败');
  } 
}

// 删除短剧分类
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 检查是否有关联的短剧
    const courseCount = await prisma.course.count({
      where: { categoryId: parseInt(id) }
    });

    if (courseCount > 0) {
      return ResponseUtil.error('该分类下有关联的短剧，无法删除');
    }

    await prisma.courseCategory.delete({
      where: { id: parseInt(id) }
    });

    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    return ResponseUtil.error('删除短剧分类失败');
  } 
} 