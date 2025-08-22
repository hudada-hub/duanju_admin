import prisma from '@/lib/prisma';
import { NextRequest } from "next/server";
import { ResponseUtil } from "@/utils/response";

// 获取短剧分类列表
export async function GET() {
  try {
    const categories = await prisma.shortsCategory.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return ResponseUtil.success(categories);
  } catch (error) {
    return ResponseUtil.error('获取短剧分类列表失败');
  } 
}

// 创建短剧分类
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return ResponseUtil.error('分类名称不能为空');
    }

    const category = await prisma.shortsCategory.create({
      data: {
        name
      }
    });

    return ResponseUtil.success(category);
  } catch (error) {
    return ResponseUtil.error('创建短剧分类失败');
  } 
} 