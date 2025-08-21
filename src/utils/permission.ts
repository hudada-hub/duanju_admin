import { NextRequest } from 'next/server';
import { verifyAuth } from './auth';
import prisma from '@/lib/prisma';

// 检查用户是否有访问特定页面的权限
export async function checkPagePermission(request: NextRequest, resource: string): Promise<boolean> {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.isAdmin) {
      return false;
    }

    // 超级管理员拥有所有权限
    if (authResult.role === 'SUPER_ADMIN') {
      return true;
    }

    // 检查用户角色是否有对应资源的权限
    const userRoles = await prisma.userRoleRelation.findMany({
      where: { userId: authResult.user!.id },
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
      userRole.role.rolePermissions.some(rolePermission =>
        rolePermission.permission.resource === resource &&
        rolePermission.permission.isEnabled &&
        userRole.role.isEnabled
      )
    );
  } catch (error) {
    console.error('检查页面权限失败:', error);
    return false;
  }
}

// 获取用户可访问的页面列表
export async function getUserAccessiblePages(userId: number): Promise<string[]> {
  try {
    console.log('getUserAccessiblePages: 开始查询用户ID:', userId);
    
    // 首先检查用户是否为超级管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    console.log('getUserAccessiblePages: 用户角色查询结果:', JSON.stringify(user, null, 2));

    // 如果是超级管理员，直接返回包含SUPER_ADMIN标识的数组
    if (user?.role === 'SUPER_ADMIN') {
      console.log('getUserAccessiblePages: 用户是超级管理员，返回SUPER_ADMIN标识');
      return ['SUPER_ADMIN'];
    }

    console.log('getUserAccessiblePages: 用户不是超级管理员，查询角色权限');

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

    console.log('getUserAccessiblePages: 用户角色权限查询结果:', JSON.stringify(userRoles, null, 2));

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

    const result = Array.from(accessiblePages);
    console.log('getUserAccessiblePages: 最终返回结果:', result);
    return result;
  } catch (error) {
    console.error('获取用户可访问页面失败:', error);
    return [];
  }
} 