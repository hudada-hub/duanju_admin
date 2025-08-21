import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';
import { GameStatus } from '@prisma/client';

// 获取游戏详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const authResult = await verifyAuth(request);
    if (!authResult?.user?.id) {
      return ResponseUtil.error('未登录或登录已过期');
    }

    const { id } = await params;

    // 获取游戏详情
    const game = await prisma.game.findUnique({
      where: { id: Number(id) },
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
      }
    });

    if (!game) {
      return ResponseUtil.error('游戏不存在');
    }

    return ResponseUtil.success(game);
  } catch (error) {
    console.error('获取游戏详情失败:', error);
    return ResponseUtil.error('服务器错误');
  } 
}

// 更新游戏信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return ResponseUtil.error('没有权限更新游戏');
    }

    const { id } = await params;
    const data = await request.json();
    const { name, announcement, carouselImages, status, downloadLink } = data;

    // 检查游戏是否存在
    const existingGame = await prisma.game.findUnique({
      where: { id: Number(id) }
    });

    if (!existingGame) {
      return ResponseUtil.error('游戏不存在');
    }

    // 如果更新了名称，检查是否与其他游戏重名
    if (name && name !== existingGame.name) {
      const duplicateGame = await prisma.game.findFirst({
        where: { 
          name,
          id: { not: Number(id) }
        }
      });
      if (duplicateGame) {
        return ResponseUtil.error('游戏名称已存在');
      }
    }

    // 更新游戏信息
    await prisma.game.update({
      where: { id: Number(id) },
      data: {
        name,
        announcement,
        carouselImages,
        status,
        downloadLink
      }
    });

    return ResponseUtil.success(null, '游戏信息更新成功');
  } catch (error) {
    console.error('更新游戏失败:', error);
    return ResponseUtil.error('服务器错误');
  } 
}

// 删除游戏
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return ResponseUtil.error('没有权限删除游戏');
    }

    const { id } = await params;

    // 检查游戏是否存在
    const existingGame = await prisma.game.findUnique({
      where: { id: Number(id) }
    });

    if (!existingGame) {
      return ResponseUtil.error('游戏不存在');
    }

    // 检查是否有报名记录
    const registrationCount = await prisma.gameRegistration.count({
      where: { gameId: Number(id) }
    });

    if (registrationCount > 0) {
      return ResponseUtil.error(`该游戏还有 ${registrationCount} 个报名记录，无法删除`);
    }

    // 删除游戏
    await prisma.game.delete({
      where: { id: Number(id) }
    });

    return ResponseUtil.success(null, '游戏删除成功');
  } catch (error) {
    console.error('删除游戏失败:', error);
    return ResponseUtil.error('服务器错误');
  } 
} 