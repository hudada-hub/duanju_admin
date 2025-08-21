import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/utils/auth';
import * as argon2 from 'argon2';
import { User,UserRole } from '@prisma/client';
// 获取管理员列表
export async function GET(request: NextRequest) {
  try {
    
  
    // 验证管理员权限
    const authResult = await verifyAuth(request);
    if (authResult.user?.role === UserRole.USER) {
      return ResponseUtil.forbidden('无权限访问');
    }

    // 查询管理员列表
    const admins = await prisma.user.findMany({
      where: {
        role: { not: UserRole.USER }
      },
      select: {
        id: true,
        nickname: true,
        email: true,
        role: true,
        avatar: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        loginCount: true,
        lastLoginIp: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return ResponseUtil.success(admins);
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    return ResponseUtil.error('获取管理员列表失败');
  }  
}

// 创建新管理员
export async function POST(request: NextRequest) {
  try {
    // 验证超级管理员权限
    const authResult = await verifyAuth(request);
    if (authResult.user?.role !== UserRole.SUPER_ADMIN) {
      return ResponseUtil.forbidden('只有超级管理员可以创建管理员账号');
    }

    // 获取请求数据
    const data = await request.json();
    const { nickname, password, email, roleIds, status, phone } = data;

    // 验证必填字段
    if (!nickname || !password) {
      return ResponseUtil.error('用户名和密码不能为空');
    }

    // 验证手机号
    if (!phone) {
      return ResponseUtil.error('手机号不能为空');
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return ResponseUtil.error('手机号格式不正确');
    }

    // 验证角色 - 检查角色是否存在于角色表中
    if (!Array.isArray(roleIds) || roleIds.length === 0) {
      return ResponseUtil.error('请至少选择一个角色');
    }

    // 验证所有角色ID是否有效
    const roleIdsInt = roleIds.map(id => parseInt(id.toString())).filter(id => !isNaN(id));
    if (roleIdsInt.length !== roleIds.length) {
      return ResponseUtil.error('存在无效的角色ID');
    }

    // 检查所有角色是否存在且启用
    const roles = await prisma.role.findMany({
      where: { 
        id: { in: roleIdsInt },
        isEnabled: true
      }
    });

    if (roles.length !== roleIdsInt.length) {
      return ResponseUtil.error('存在无效或未启用的角色');
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { nickname }
    });

    if (existingUser) {
      return ResponseUtil.error('用户名已存在');
    }

    // 检查手机号是否已存在
    const existingPhone = await prisma.user.findUnique({
      where: { phone: phone }
    });

    if (existingPhone) {
      return ResponseUtil.error('手机号已存在');
    }

    // 创建新管理员 - 使用事务确保数据一致性
    const newAdmin = await prisma.$transaction(async (tx) => {
      // 创建用户记录
      const user = await tx.user.create({
        data: {
          nickname,
          password: await argon2.hash(password),
          email,
          role: UserRole.ADMIN, // 设置为ADMIN类型
          status: status || 'ACTIVE',
          phone: phone // 使用前端提供的手机号
        }
      });

      // 建立用户与角色的关联关系
      for (const roleId of roleIdsInt) {
        await tx.userRoleRelation.create({
          data: {
            userId: user.id,
            roleId: roleId
          }
        });
      }

      return user;
    });

    return ResponseUtil.success(null, '管理员创建成功');
  } catch (error) {
    console.error('创建管理员失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
    } 
    return ResponseUtil.error(`创建管理员失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } 
}