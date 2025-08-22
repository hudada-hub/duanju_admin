import prisma from '@/lib/prisma';
import { NextRequest } from "next/server";
import { ResponseUtil } from "@/utils/response";

// 获取短剧列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const keyword = searchParams.get('keyword') || '';

    // 构建查询条件
    const where = {
      isDeleted: false,
      title: {
        contains: keyword,
      },
    };

    // 查询总数
    const total = await prisma.short.count({ where });

    // 查询数据
    const shorts = await prisma.short.findMany({
      where,
      include: {
        category: true,
        direction: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return ResponseUtil.success({
      items: shorts,
      total,
    });
  } catch (error) {
    return ResponseUtil.error('获取短剧列表失败');
  } 
}

// 创建短剧
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 必填字段验证
    const requiredFields = ['title', 'coverUrl', 'description', 'instructor', 'directionId', 'categoryId', 'level', 'watermarkType', 'watermarkContent', 'watermarkPosition'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return ResponseUtil.error(`${field}不能为空`);
      }
    }

    const short = await prisma.short.create({
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

    return ResponseUtil.success(short);
  } catch (error) {
    return ResponseUtil.error('创建短剧失败');
  } 
} 