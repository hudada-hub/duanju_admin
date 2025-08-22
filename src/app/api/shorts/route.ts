import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 获取用户创建的短剧列表
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '12');
    const keyword = searchParams.get('keyword') || '';
    const categoryId = searchParams.get('categoryId');
    const directionId = searchParams.get('directionId');

    // 构建查询条件
    const where: any = {
      uploaderId: user.id, // 只获取当前用户创建的短剧
      isDeleted: false, // 排除已删除的短剧
    };

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { summary: { contains: keyword } },
      ];
    }

    // 分类筛选
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    // 方向筛选
    if (directionId) {
      where.directionId = parseInt(directionId);
    }

    // 查询总数
    const total = await prisma.short.count({ where });

    // 分页查询短剧
    const shorts = await prisma.short.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        direction: {
          select: {
            id: true,
            name: true
          }
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return ResponseUtil.success({
      data: shorts,
      pagination: {
        page,
        pageSize,
        total,
      },
    });
  } catch (error) {
    console.error('获取短剧列表失败:', error);
    return ResponseUtil.error('获取短剧列表失败');
  }
}

// 创建短剧
export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const data = await request.json();
    const {
      title,
      description,
      coverUrl,
      instructor,
      categoryId,
      directionId,
      oneTimePayment = false, // 添加一次性支付字段
      oneTimePoint = 0, // 添加一次性支付积分字段
      shortsware = null, // 添加课件字段
    } = data;

    // 创建短剧
    const short = await prisma.short.create({
      data: {
        title,
        description,
        summary: description, // 使用描述作为简介
        coverUrl,
        instructor,
        categoryId: parseInt(categoryId),
        directionId: parseInt(directionId),
      
        uploaderId: user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        direction: {
          select: {
            id: true,
            name: true
          }
        },
      },
    });

    return ResponseUtil.success(short);
  } catch (error) {
    console.error('创建短剧失败:', error);
    return ResponseUtil.error('创建短剧失败');
  }
}

// 更新短剧
export async function PUT(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const data = await request.json();
    const {
      id,
      title,
      description,
      coverUrl,
      instructor,
      categoryId,
      directionId,
      targetAudience,
      shortsGoals,
      oneTimePayment = false, // 添加一次性支付字段
      oneTimePoint = 0, // 添加一次性支付积分字段
      shortsware = null, // 添加课件字段
    } = data;

    // 检查短剧是否存在且属于当前用户
    const existingShort = await prisma.short.findFirst({
      where: {
        id: parseInt(id),
        uploaderId: user.id,
        isDeleted: false,
      },
    });

    if (!existingShort) {
      return ResponseUtil.notFound('短剧不存在或无权限修改');
    }

    // 更新短剧
    const short = await prisma.short.update({
      where: {
        id: parseInt(id),
      },
      data: {
        title,
        description,
        summary: description, // 使用描述作为简介
        coverUrl,
        instructor,
        categoryId: parseInt(categoryId),
        directionId: parseInt(directionId),
    
      
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        direction: {
          select: {
            id: true,
            name: true
          }
        },
      },
    });

    return ResponseUtil.success(short);
  } catch (error) {
    console.error('更新短剧失败:', error);
    return ResponseUtil.error('更新短剧失败');
  }
} 