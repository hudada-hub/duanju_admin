import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';
import { GameStatus } from '@prisma/client';

// 获取游戏列表
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAuth(request);
    if (!authResult?.user?.id) {
      return ResponseUtil.error('未登录或登录已过期');
    }

    // 检查是否为管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.user.id }
    });
    


    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // 构建查询条件
    const where: any = {};

    // 搜索条件
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { announcement: { contains: search } }
      ];
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 计算分页
    const skip = (page - 1) * pageSize;

    // 获取总数
    const total = await prisma.game.count({ where });

    // 获取游戏列表
    const games = await prisma.game.findMany({
      where,
      include: {
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize
    });

    return ResponseUtil.success({
      items: games,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取游戏列表失败:', error);
    return ResponseUtil.error('服务器错误');
  } 
}

// 创建新游戏
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAuth(request);
    if (!authResult?.user?.id) {
      return ResponseUtil.error('未登录或登录已过期');
    }

    // 检查是否为超级管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.user.id }
    });
    
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return ResponseUtil.error('没有权限创建游戏');
    }

    // 获取请求数据
    const data = await request.json();
    const { name, announcement, carouselImages, status, downloadLink } = data;

    // 验证必填字段
    if (!name) {
      return ResponseUtil.error('游戏名称不能为空');
    }

    // 检查游戏名称是否已存在
    const existingGame = await prisma.game.findFirst({ 
      where: { name } 
    });
    if (existingGame) {
      return ResponseUtil.error('游戏名称已存在');
    }

    // 创建新游戏
    const game = await prisma.game.create({
      data: {
        name,
        announcement,
        carouselImages,
        status: status || GameStatus.ACTIVE,
        downloadLink
      }
    });

    return ResponseUtil.success(game, '游戏创建成功');
  } catch (error) {
    console.error('创建游戏失败:', error);
    return ResponseUtil.error('服务器错误');
  } 
} 