import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.courseCategory.findMany({
      orderBy: {
        id: 'asc',
      },
    });
    
    return ResponseUtil.success(categories);
  } catch (error) {
    return ResponseUtil.error('获取课程分类失败');
  }
} 