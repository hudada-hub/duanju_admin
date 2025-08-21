import prisma from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { verifyAuth } from '@/utils/auth';

// 获取个人资料
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const userData = await verifyAuth(request);
    if (!userData.user) {
      return NextResponse.json({
        code: 401,
        message: '未登录',
        data: null,
      }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userData.user.id },
      select: {
        id: true,
        nickname: true,
        email: true,
        avatar: true,
        role: true,
      }
    });

    if (!user) {
      return NextResponse.json({
        code: 404,
        message: '用户不存在',
        data: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      code: 0,
      message: '获取成功',
      data: user,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({
      code: 1,
      message: '获取用户信息失败',
      data: null,
    } , { status: 500 });
  }
}

// 更新个人资料
export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const userData = await verifyAuth(request);
    if (!userData.user) {
      return NextResponse.json({
        code: 401,
        message: '未登录',
        data: null,
      }, { status: 401 });
    }

    const body = await request.json();
    const { nickname, email } = body;

    // 检查邮箱是否被其他用户使用
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userData.user.id }
      }
    });

    if (existingUser) {
      return NextResponse.json({
        code: 1,
        message: '该邮箱已被使用',
        data: null,
      }, { status: 400 });
    }

    // 更新用户信息
    await prisma.user.update({
      where: { id: userData.user.id },
      data: {
        nickname,
        email
      }
    });

    return NextResponse.json({
      code: 0,
      message: '更新成功',
      data: null,
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json({
      code: 1,
      message: '更新用户信息失败',
      data: null,
    } , { status: 500 });
  }
}