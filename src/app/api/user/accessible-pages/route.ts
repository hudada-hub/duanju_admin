import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.isAdmin) {
      return ResponseUtil.unauthorized('未授权访问');
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');

    // 如果指定了资源，检查用户是否有该资源的权限
    if (resource) {
      const hasPermission = await checkResourcePermission(authResult.user!.id, resource);
      return ResponseUtil.success({ accessible: hasPermission });
    }

    // 否则返回用户可访问的所有页面
    const accessiblePages = await getUserAccessiblePages(authResult.user!.id);
    return ResponseUtil.success({ pages: accessiblePages });
  } catch (error) {
    console.error('获取用户可访问页面失败:', error);
    return ResponseUtil.serverError('获取用户可访问页面失败');
  } 
}

// 检查用户是否有特定资源的权限
async function checkResourcePermission(userId: number, resource: string): Promise<boolean> {
  try {
    // 检查用户是否为超级管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    // 检查用户角色是否有对应资源的权限
    const userRoles = await prisma.userRoleRelation.findMany({
      where: { userId },
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

    return userRoles.some(userRole =>
      userRole.role.isEnabled &&
      userRole.role.rolePermissions.some(rolePermission =>
        rolePermission.permission.resource === resource &&
        rolePermission.permission.isEnabled
      )
    );
  } catch (error) {
    console.error('检查资源权限失败:', error);
    return false;
  }
}

// 获取用户可访问的页面列表
async function getUserAccessiblePages(userId: number): Promise<string[]> {
  try {
    // 首先检查用户是否为超级管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // 如果是超级管理员，直接返回包含SUPER_ADMIN标识的数组
    if (user?.role === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN'];
    }

    // 否则查询用户角色的具体权限
    const userRoles = await prisma.userRoleRelation.findMany({
      where: { userId },
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

    const accessiblePages = new Set<string>();
    
    userRoles.forEach(userRole => {
      if (userRole.role.isEnabled) {
        userRole.role.rolePermissions.forEach(rolePermission => {
          if (rolePermission.permission.isEnabled) {
            accessiblePages.add(rolePermission.permission.resource);
          }
        });
      }
    });

    return Array.from(accessiblePages);
  } catch (error) {
    console.error('获取用户可访问页面失败:', error);
    return [];
  }
} 