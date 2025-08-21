import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';



export async function verifyAuth(request: NextRequest) {
  try {
    // 优先从 Authorization header 获取 token
    let token = request.headers.get('authorization')?.split(' ')[1];
    
    // 如果 header 中没有，则从 cookie 中获取
    if (!token) {
      const cookies = request.headers.get('cookie');
      if (cookies) {
        const tokenCookie = cookies.split(';').find(cookie => 
          cookie.trim().startsWith('token=')
        );
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }
    }

    if (!token) {
      console.log('verifyAuth: 没有找到token，既不在Authorization header中，也不在cookie中');
      return { isAdmin: false };
    }

    console.log('verifyAuth: 找到token:', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      nickname: string;
      role: UserRole;
      isAdmin: boolean;
    };

    console.log('verifyAuth: JWT解码结果:', JSON.stringify(decoded, null, 2));

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nickname: true,
        phone: true,
        email: true,
        avatar: true,
        role: true,
        status: true
      }
    });

    console.log('verifyAuth: 数据库查询结果:', JSON.stringify(user, null, 2));

    if (!user || user.status !== 'ACTIVE') {
      console.log('verifyAuth: 用户不存在或状态不是ACTIVE');
      return { isAdmin: false };
    }

    // 动态判断是否为管理员（包括超级管理员）
    const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    console.log('verifyAuth: 用户角色:', user.role, '是否为管理员:', isAdmin);

    return {
      user,
      isAdmin,
      role: user.role
    };
  } catch (error) {
    console.error('verifyAuth: 验证失败:', error);
    return { isAdmin: false };
  }
}

export function hasSuperAdminAccess(userData: {
  user?: {
    id?: number;
    nickname?: string;
    role?: string;
  } | null;
} | null): boolean {
  return userData?.user?.role === UserRole.SUPER_ADMIN;
}