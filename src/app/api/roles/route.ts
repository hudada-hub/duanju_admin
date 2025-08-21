import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { getUserFromToken } from '@/utils/server-auth';

// 获取角色列表
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限 - 检查是否有角色管理权限
    const user = await getUserFromToken(request);
    if (!user) {
      return ResponseUtil.error('未登录', 401);
    }

    // 检查用户是否有角色管理权限
    const userRoles = await prisma.userRoleRelation.findMany({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    // 检查是否有角色管理权限
    const hasRolePermission = userRoles.some(userRole =>
      userRole.role.rolePermissions.some(rp => 
        rp.permission.resource === 'ROLE'
      )
    );

    // 超级管理员默认有所有权限
    if (user.role === 'SUPER_ADMIN' || hasRolePermission) {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '10');

      // 构建查询条件
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (status) {
        where.isEnabled = status === 'enabled';
      }

      // 查询总数
      const total = await prisma.role.count({ where });

      // 查询角色列表
      const roles = await prisma.role.findMany({
        where,
        include: {
          _count: {
            select: {
              userRoles: true,
              rolePermissions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      // 计算总页数
      const totalPages = Math.ceil(total / pageSize);

      return ResponseUtil.success({
        items: roles,
        total,
        page,
        pageSize,
        totalPages
      });
    } else {
      return ResponseUtil.error('无权限访问', 403);
    }
  } catch (error) {
    console.error('获取角色列表失败:', error);
    return ResponseUtil.error('获取角色列表失败');
  } 
}

// 创建新角色
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限 - 检查是否有角色管理权限
    const user = await getUserFromToken(request);
    if (!user) {
      return ResponseUtil.error('未登录', 401);
    }

    // 检查用户是否有角色管理权限
    const userRoles = await prisma.userRoleRelation.findMany({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    // 检查是否有角色创建权限
    const hasCreatePermission = userRoles.some(userRole =>
      userRole.role.rolePermissions.some(rp => 
        rp.permission.resource === 'ROLE'
      )
    );

    // 超级管理员默认有所有权限
    if (user.role === 'SUPER_ADMIN' || hasCreatePermission) {
      const body = await request.json();
      const { name, description, isEnabled = true } = body;

      // 验证必填字段
      if (!name) {
        return ResponseUtil.error('角色名称不能为空');
      }

      // 检查角色名称是否已存在
      const existingRole = await prisma.role.findUnique({
        where: { name }
      });

      if (existingRole) {
        return ResponseUtil.error('角色名称已存在');
      }

      // 创建角色
      const role = await prisma.role.create({
        data: {
          name,
          description,
          isEnabled
        }
      });

      return ResponseUtil.success(role, '角色创建成功');
    } else {
      return ResponseUtil.error('无权限访问', 403);
    }
  } catch (error) {
    console.error('创建角色失败:', error);
    return ResponseUtil.error('创建角色失败');
  } 
} 