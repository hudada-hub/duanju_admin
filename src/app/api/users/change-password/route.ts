import prisma from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';
import * as argon2 from 'argon2';
import { verifyAuth } from '@/utils/auth';

export async function POST(request: NextRequest) {
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
    const { oldPassword, newPassword } = body;

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userData.user.id },
      select: {
        id: true,
        password: true
      }
    });

    if (!user) {
      return NextResponse.json({
        code: 404,
        message: '用户不存在',
        data: null,
      }, { status: 404 });
    }

    // 验证旧密码
    const isValidPassword = await argon2.verify(user.password, oldPassword);
    if (!isValidPassword) {
      return NextResponse.json({
        code: 1,
        message: '当前密码错误',
        data: null,
      }, { status: 400 });
    }

    // 更新密码
    const hashedPassword = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword
      }
    });

    return NextResponse.json({
      code: 0,
      message: '密码修改成功',
      data: null,
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json({
      code: 1,
      message: '修改密码失败',
      data: null,
    } , { status: 500 });
  }
}