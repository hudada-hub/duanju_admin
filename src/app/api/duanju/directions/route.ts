import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';

export async function GET(request: NextRequest) {
  try {
    const directions = await prisma.courseDirection.findMany({
      orderBy: {
        id: 'asc',
      },
    });
    
    return ResponseUtil.success(directions);
  } catch (error) {
    return ResponseUtil.error('获取课程方向失败');
  }
} 