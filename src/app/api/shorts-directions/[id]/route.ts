import prisma from '@/lib/prisma';
import { NextRequest } from "next/server";
import { ResponseUtil } from "@/utils/response";

// 更新短剧方向
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return ResponseUtil.error('方向名称不能为空');
    }

    const direction = await prisma.shortsDirection.update({
      where: { id: parseInt(id) },
      data: { name }
    });

    return ResponseUtil.success(direction);
  } catch (error) {
    return ResponseUtil.error('更新短剧方向失败');
  } 
}

// 删除短剧方向
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 检查是否有关联的短剧
    const shortCount = await prisma.short.count({
      where: { directionId: parseInt(id) }
    });

    if (shortCount > 0) {
      return ResponseUtil.error('该方向下有关联的短剧，无法删除');
    }

    await prisma.shortsDirection.delete({
      where: { id: parseInt(id) }
    });

    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    return ResponseUtil.error('删除短剧方向失败');
  } 
} 