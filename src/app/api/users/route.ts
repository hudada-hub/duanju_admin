import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';
import * as argon2 from 'argon2';
import { UserRole, UserStatus } from '@prisma/client';

// 获取用户列表
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
    
    if (!currentUser || (currentUser.role === UserRole.USER )) {
      return ResponseUtil.error('没有权限访问');
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';

    // 构建查询条件
    const where: any = {
      role: UserRole.USER // 只查询普通用户
    };

    // 搜索条件
    if (search) {
      where.OR = [
        { nickname: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 角色筛选
    if (role) {
      where.role = role;
    }

    // 计算分页
    const skip = (page - 1) * pageSize;

    // 获取总数
    const total = await prisma.user.count({ where });

    // 获取用户列表
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        loginCount: true,
        points: true,
        studyTime: true
      },
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize
    });

    return ResponseUtil.success({
      items: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return ResponseUtil.error('服务器错误');
  } 
}

// 创建新用户
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
    
    if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
      return ResponseUtil.error('没有权限创建用户');
    }

    // 获取请求数据
    const data = await request.json();
    const { nickname, email, password, role, phone, points = 0 } = data;

    // 验证必填字段
    if (!nickname || !password || !phone) {
      return ResponseUtil.error('昵称、手机号和密码不能为空');
    }

    // 验证密码强度
    if (password.length < 6) {
      return ResponseUtil.error('密码长度至少需要6位');
    }

    // 检查昵称是否已存在
    const existingNickname = await prisma.user.findUnique({ 
      where: { nickname } 
    });
    if (existingNickname) {
      return ResponseUtil.error('昵称已存在');
    }

    // 检查手机号是否已存在
    const existingPhone = await prisma.user.findUnique({ 
      where: { phone } 
    });
    if (existingPhone) {
      return ResponseUtil.serverError('手机号已存在');
    }

    // 创建新用户
    const user = await prisma.user.create({
      data: {
        nickname,
        phone,
        email,
        password: await argon2.hash(password),
        role: role || UserRole.USER,
        status: UserStatus.ACTIVE,
        points: points || 0
      }
    });

    return ResponseUtil.success(user, '用户创建成功');
  } catch (error) {
    console.error('创建用户失败:', error);
    return ResponseUtil.error('服务器错误');
  } 
}

// 更新用户信息
export async function PUT(request: NextRequest) {
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
    
    if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
      return ResponseUtil.error('没有权限更新用户');
    }

    // 获取请求数据
    const data = await request.json();
    const { id, nickname, email, role, status } = data;

    // 更新用户信息
    await prisma.user.update({
      where: { id },
      data: {
        nickname,
        email,
        role,
        status
      }
    });

    return ResponseUtil.success(null, '用户信息更新成功');
  } catch (error) {
    console.error('更新用户失败:', error);
    return ResponseUtil.error('服务器错误');
  } 
}