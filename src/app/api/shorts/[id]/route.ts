import prisma from '@/lib/prisma';
import { NextRequest } from "next/server";
import { ResponseUtil } from "@/utils/response";

// 获取短剧详情
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const short = await prisma.short.findUnique({
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

    if (!short) {
      return ResponseUtil.error('短剧不存在');
    }

    return ResponseUtil.success(short);
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
    const requiredFields = ['title', 'coverUrl', 'description', 'instructor', 'directionId', 'categoryId','status'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return ResponseUtil.error(`${field}不能为空`);
      }
    }

    const short = await prisma.short.update({
      where: { id: parseInt(id) },
      data: {
        title: data.title,
        coverUrl: data.coverUrl,
        description: data.description,
        instructor: data.instructor,
        status: data.status,
        tags: data.tags || [], // 确保tags是数组
        isFree: data.isFree, // 是否免费
        isTop: data.isTop, // 是否置顶
        isHidden: data.isHidden, // 是否隐藏
        // 使用关系连接而不是直接的外键ID
        direction: {
          connect: { id: data.directionId }
        },
        category: {
          connect: { id: data.categoryId }
        },
      },
      include: {
        category: true,
        direction: true,
      }
    });

    return ResponseUtil.success(short);
  } catch (error) {
    console.log(error,'error')
    return ResponseUtil.error('更新短剧失败');
  } 
}

// 删除短剧（软删除）
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.short.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true }
    });

    return ResponseUtil.success(null, '删除成功');
  } catch (error) {
    return ResponseUtil.error('删除短剧失败');
  } 
} 