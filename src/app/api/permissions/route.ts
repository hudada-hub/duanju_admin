import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { getUserFromToken } from '@/utils/server-auth';

// 获取权限列表
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限 - 检查是否有权限管理权限
    const user = await getUserFromToken(request);
    if (!user) {
      return ResponseUtil.error('未登录', 401);
    }

    // 检查用户是否有权限管理权限
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

    // 检查是否有权限读取权限
    const hasPermissionRead = userRoles.some(userRole =>
      userRole.role.rolePermissions.some(rp => 
        rp.permission.resource === 'PERMISSION'
      )
    );

    // 超级管理员默认有所有权限
    if (user.role === 'SUPER_ADMIN' || hasPermissionRead) {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search') || '';
      const resource = searchParams.get('resource') || '';
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
      
      if (resource) {
        where.resource = resource;
      }
      
      if (status) {
        where.isEnabled = status === 'enabled';
      }

      // 查询总数
      const total = await prisma.permission.count({ where });

      // 查询权限列表
      const permissions = await prisma.permission.findMany({
        where,
        include: {
          _count: {
            select: {
              rolePermissions: true
            }
          }
        },
        orderBy: [{ resource: 'asc' }],
      });

      // 计算总页数
      const totalPages = Math.ceil(total / pageSize);

      return ResponseUtil.success({
        items: permissions,
        total,
        page,
        pageSize,
        totalPages
      });
    } else {
      return ResponseUtil.error('无权限访问', 403);
    }
  } catch (error) {
    console.error('获取权限列表失败:', error);
    return ResponseUtil.error('获取权限列表失败');
  } 
}

// 创建新权限
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限 - 检查是否有权限管理权限
    const user = await getUserFromToken(request);
    if (!user) {
      return ResponseUtil.error('未登录', 401);
    }

    // 检查用户是否有权限创建权限
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

    // 检查是否有权限创建权限
    const hasPermissionCreate = userRoles.some(userRole =>
      userRole.role.rolePermissions.some(rp => 
        rp.permission.resource === 'PERMISSION'
      )
    );

    // 超级管理员默认有所有权限
    if (user.role === 'SUPER_ADMIN' || hasPermissionCreate) {
      const body = await request.json();
      const { name, description, resource, isEnabled = true } = body;

      // 验证必填字段
      if (!name || !resource) {
        return ResponseUtil.error('权限名称和资源不能为空');
      }

      // 检查权限是否已存在
      const existingPermission = await prisma.permission.findFirst({
        where: {
          resource
        }
      });

      if (existingPermission) {
        return ResponseUtil.error('该资源的权限已存在');
      }

      // 创建权限
      const permission = await prisma.permission.create({
        data: {
          name,
          description,
          resource,
          isEnabled
        }
      });

      return ResponseUtil.success(permission, '权限创建成功');
    } else {
      return ResponseUtil.error('无权限访问', 403);
    }
  } catch (error) {
    console.error('创建权限失败:', error);
    return ResponseUtil.error('创建权限失败');
  } 
} 