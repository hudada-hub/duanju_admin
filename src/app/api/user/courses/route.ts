import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 获取用户创建的课程列表
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
    const level = searchParams.get('level');

    // 构建查询条件
    const where: any = {
      uploaderId: user.id, // 只获取当前用户创建的课程
      isDeleted: false, // 排除已删除的课程
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

    // 难度筛选
    if (level) {
      where.level = level;
    }

    // 查询总数
    const total = await prisma.course.count({ where });

    // 分页查询课程
    const courses = await prisma.course.findMany({
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
      data: courses,
      pagination: {
        page,
        pageSize,
        total,
      },
    });
  } catch (error) {
    console.error('获取课程列表失败:', error);
    return ResponseUtil.error('获取课程列表失败');
  }
}

// 创建课程
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
      level,
      instructor,
      categoryId,
      directionId,
      targetAudience,
      courseGoals,
      oneTimePayment = false, // 添加一次性支付字段
      oneTimePoint = 0, // 添加一次性支付积分字段
      courseware = null, // 添加课件字段
    } = data;

    // 创建课程
    const course = await prisma.course.create({
      data: {
        title,
        description,
        summary: description, // 使用描述作为简介
        coverUrl,
        level,
        instructor,
        categoryId: parseInt(categoryId),
        directionId: parseInt(directionId),
        targetAudience,
        courseGoals,
        oneTimePayment,
        oneTimePoint: parseInt(oneTimePoint), // 添加一次性支付积分
        courseware, // 添加课件数据
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

    return ResponseUtil.success(course);
  } catch (error) {
    console.error('创建课程失败:', error);
    return ResponseUtil.error('创建课程失败');
  }
}

// 更新课程
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
      level,
      instructor,
      categoryId,
      directionId,
      targetAudience,
      courseGoals,
      oneTimePayment = false, // 添加一次性支付字段
      oneTimePoint = 0, // 添加一次性支付积分字段
      courseware = null, // 添加课件字段
    } = data;

    // 检查课程是否存在且属于当前用户
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: parseInt(id),
        uploaderId: user.id,
        isDeleted: false,
      },
    });

    if (!existingCourse) {
      return ResponseUtil.notFound('课程不存在或无权限修改');
    }

    // 更新课程
    const course = await prisma.course.update({
      where: {
        id: parseInt(id),
      },
      data: {
        title,
        description,
        summary: description, // 使用描述作为简介
        coverUrl,
        level,
        instructor,
        categoryId: parseInt(categoryId),
        directionId: parseInt(directionId),
        targetAudience,
        courseGoals,
        oneTimePayment,
        oneTimePoint: parseInt(oneTimePoint), // 添加一次性支付积分
        courseware, // 添加课件数据
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

    return ResponseUtil.success(course);
  } catch (error) {
    console.error('更新课程失败:', error);
    return ResponseUtil.error('更新课程失败');
  }
} 