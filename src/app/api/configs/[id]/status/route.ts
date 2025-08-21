import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/utils/server-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: number }> }) {
  try {
    // 验证用户身份
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({
        code: 401,
        message: '未登录或登录已过期',
        data: null
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isEnabled } = body;

    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json({
        code: 400,
        message: '无效的状态值',
        data: null
      }, { status: 400 });
    }

    const config = await prisma.config.update({
      where: { id },
      data: { isEnabled }
    });

    return NextResponse.json({
      code: 0,
      message: '更新成功',
      data: config
    });
  } catch (error) {
    console.error('更新配置状态失败:', error);
    return NextResponse.json({
      code: 500,
      message: '更新配置状态失败',
      data: null
    } , { status: 500 });
  }
} 