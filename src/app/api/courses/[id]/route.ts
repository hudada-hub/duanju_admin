import prisma from '@/lib/prisma';
import { NextRequest } from "next/server";
import { ResponseUtil } from "@/utils/response";

// 获取短剧详情
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        direction: true,
        chapters: {
          orderBy: {
            sort: 'asc'
          }
        }
      }
    });

    if (!course) {
      return ResponseUtil.error('短剧不存在');
    }

    return ResponseUtil.success(course);
  } catch (error) {
    return ResponseUtil.error('获取短剧详情失败');
  } 
}

// 更新短剧
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();

    // 必填字段验证
    const requiredFields = ['title', 'coverUrl', 'description', 'instructor', 'directionId', 'categoryId', 'level', 'watermarkType', 'watermarkContent', 'watermarkPosition'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return ResponseUtil.error(`${field}不能为空`);
      }
    }

    const course = await prisma.course.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        tags: data.tags || [], // 确保tags是数组
        textFormat: data.textFormat || {}, // 确保textFormat是对象
      },
      include: {
        category: true,
        direction: true,
      }
    });

    return ResponseUtil.success(course);
  } catch (error) {
    return ResponseUtil.error('更新短剧失败');
  } 
}

// 删除短剧（软删除）
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.course.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true }
    });

    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    return ResponseUtil.error('删除短剧失败');
  } 
} 