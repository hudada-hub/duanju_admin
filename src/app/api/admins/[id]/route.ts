import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';
import * as argon2 from 'argon2';  // 导入 argon2 用于密码加密
import { UserRole,UserStatus } from '@prisma/client';

// 检查管理员权限的辅助函数
async function checkAdminPermission(userId: number, resource: string) {
  try {
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
      userRole.role.rolePermissions.some(rolePermission =>
        rolePermission.permission.resource === resource &&
        rolePermission.permission.isEnabled &&
        userRole.role.isEnabled
      )
    );
  } catch (error) {
    console.error('检查权限失败:', error);
    return false;
  }
}


// 获取管理员详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: number }> }
) {
  try {
    const { id } = await params;
    
    // 验证用户登录
    const authResult = await verifyAuth(request);
    if (!authResult.isAdmin) {
      return ResponseUtil.forbidden('无权限访问');
    }

    // 检查是否有查看管理员的权限
    if (authResult.user) {
      const hasReadPermission = await checkAdminPermission(authResult.user.id, 'ADMIN');
      if (authResult.role !== UserRole.SUPER_ADMIN && !hasReadPermission) {
        return ResponseUtil.forbidden('无权限查看管理员信息');
      }
    }

    // 查询管理员信息
    const admin = await prisma.user.findUnique({
      where: { 
        id: Number(id),
        role: { not: UserRole.USER }  // 查询所有非用户角色
      },
      select: {
        id: true,
        nickname: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
        loginCount: true,
        lastLoginIp: true,
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                isEnabled: true
              }
            }
          }
        }
      }
    });

    if (!admin) {
      return ResponseUtil.error('管理员不存在');
    }

    // 返回管理员信息，包含完整的角色信息
    const adminData = {
      ...admin,
      userRoles: admin.userRoles
    };

    return ResponseUtil.success(adminData);
  } catch (error) {
    console.error('获取管理员详情失败:', error);
    return ResponseUtil.error('获取管理员详情失败');
  } 
}

// 更新管理员信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: number }> }
) {
  try {
    const { id } = await params;
    // 验证用户登录
    const authResult = await verifyAuth(request);
    if (!authResult.isAdmin) {
      return ResponseUtil.forbidden('无权限访问');
    }

    // 检查是否有修改管理员的权限
    if (authResult.user) {
      const hasUpdatePermission = await checkAdminPermission(authResult.user.id, 'ADMIN');
      if (authResult.role !== UserRole.SUPER_ADMIN && !hasUpdatePermission) {
        return ResponseUtil.forbidden('无权限修改管理员信息');
      }
    }

    // 获取请求数据
    const data = await request.json();
    const { email, roleIds, status } = data;

    // 验证角色 - 检查角色是否存在于Role表中
    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
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
    }

    // 更新管理员信息
    const admin = await prisma.user.findUnique({
      where: { 
        id: Number(id),
        role: { not: UserRole.USER }
      }
    });

    if (!admin) {
      return ResponseUtil.error('管理员不存在');
    }

    // 使用事务更新用户信息和角色关系
    await prisma.$transaction(async (tx) => {
      // 更新用户基本信息
      await tx.user.update({
        where: { id: Number(id) },
        data: {
          email,
          status
        }
      });

      // 如果提供了角色，更新角色关系
      if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
        const roleIdsInt = roleIds.map(id => parseInt(id.toString())).filter(id => !isNaN(id));
        
        // 删除现有的角色关系
        await tx.userRoleRelation.deleteMany({
          where: { userId: Number(id) }
        });

        // 创建新的角色关系
        for (const roleId of roleIdsInt) {
          await tx.userRoleRelation.create({
            data: {
              userId: Number(id),
              roleId: roleId
            }
          });
        }
      }
    });

    return ResponseUtil.success(null, '管理员信息更新成功');
  } catch (error) {
    console.error('更新管理员信息失败:', error);
    return ResponseUtil.error('更新管理员信息失败');
  } 
}

// 删除管理员
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: number }> }
) {
  const { id } = await params;
  try {
    // 验证用户登录
    const authResult = await verifyAuth(request);
    if (!authResult.isAdmin) {
      return ResponseUtil.forbidden('无权限访问');
    }

    // 检查是否有删除管理员的权限
    if (authResult.user) {
      const hasDeletePermission = await checkAdminPermission(authResult.user.id, 'ADMIN');
      if (authResult.role !== UserRole.SUPER_ADMIN && !hasDeletePermission) {
        return ResponseUtil.forbidden('无权限删除管理员账号');
      }
    }

    // 软删除管理员
    const admin = await prisma.user.update({
      where: { 
        id: Number(id),
        role: { not: UserRole.USER }
      },
      data: {
        status: UserStatus.DELETED
      }
    });

    if (!admin) {
      return ResponseUtil.error('管理员不存在');
    }

    return ResponseUtil.success(null, '管理员删除成功');
  } catch (error) {
    console.error('删除管理员失败:', error);
    return ResponseUtil.error('删除管理员失败');
  } 
}