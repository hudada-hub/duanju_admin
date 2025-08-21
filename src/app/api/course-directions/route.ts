import prisma from '@/lib/prisma';
import { NextRequest } from "next/server";
import { ResponseUtil } from "@/utils/response";

// 获取短剧方向列表
export async function GET() {
  try {
    const directions = await prisma.courseDirection.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return ResponseUtil.success(directions);
  } catch (error) {
    return ResponseUtil.error('获取短剧方向列表失败');
  } 
}

// 创建短剧方向
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return ResponseUtil.error('方向名称不能为空');
    }

    const direction = await prisma.courseDirection.create({
      data: {
        name
      }
    });

    return ResponseUtil.success(direction);
  } catch (error) {
    return ResponseUtil.error('创建短剧方向失败');
  } 
} 