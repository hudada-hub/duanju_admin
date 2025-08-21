import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { getUserFromToken } from '@/utils/server-auth';

// 检查用户是否有权限管理权限的辅助函数
async function checkPermissionPermission(userId: number, action: 'READ' | 'UPDATE' | 'DELETE') {
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
    userRole.role.rolePermissions.some(rp => 
      rp.permission.resource === 'PERMISSION'
    )
  );
}

// 获取权限详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const user = await getUserFromToken(request);
    if (!user) {
      return ResponseUtil.error('未登录', 401);
    }

    // 检查是否有权限读取权限
    const hasReadPermission = await checkPermissionPermission(user.id, 'READ');
    if (user.role !== 'SUPER_ADMIN' && !hasReadPermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      return ResponseUtil.error('无效的权限ID');
    }

    // 查询权限详情
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        _count: {
          select: {
            rolePermissions: true
          }
        },
        rolePermissions: {
          include: {
            role: true
          }
        }
      }
    });

    if (!permission) {
      return ResponseUtil.error('权限不存在', 404);
    }

    return ResponseUtil.success(permission);
  } catch (error) {
    console.error('获取权限详情失败:', error);
    return ResponseUtil.error('获取权限详情失败');
  } 
}

// 更新权限
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const user = await getUserFromToken(request);
    if (!user) {
      return ResponseUtil.error('未登录', 401);
    }

    // 检查是否有权限更新权限
    const hasUpdatePermission = await checkPermissionPermission(user.id, 'UPDATE');
    if (user.role !== 'SUPER_ADMIN' && !hasUpdatePermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      return ResponseUtil.error('无效的权限ID');
    }

    const body = await request.json();
    const { name, description, resource, isEnabled } = body;

    // 验证必填字段
    if (!name || !resource) {
      return ResponseUtil.error('权限名称和资源不能为空');
    }

    // 检查权限是否存在
    const existingPermission = await prisma.permission.findUnique({
      where: { id: permissionId }
    });

    if (!existingPermission) {
      return ResponseUtil.error('权限不存在', 404);
    }

    // 检查该资源的权限是否已被其他权限使用
    if (resource !== existingPermission.resource) {
      const permissionExists = await prisma.permission.findFirst({
        where: {
          resource,
          id: { not: permissionId }
        }
      });

      if (permissionExists) {
        return ResponseUtil.error('该资源的权限已存在');
      }
    }

    // 更新权限
    const updatedPermission = await prisma.permission.update({
      where: { id: permissionId },
      data: {
        name,
        description,
        resource,
        isEnabled
      }
    });

    return ResponseUtil.success(updatedPermission, '权限更新成功');
  } catch (error) {
    console.error('更新权限失败:', error);
    return ResponseUtil.error('更新权限失败');
  } 
}

// 删除权限
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const user = await getUserFromToken(request);
    if (!user) {
      return ResponseUtil.error('未登录', 401);
    }

    // 检查是否有权限删除权限
    const hasDeletePermission = await checkPermissionPermission(user.id, 'DELETE');
    if (user.role !== 'SUPER_ADMIN' && !hasDeletePermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      return ResponseUtil.error('无效的权限ID');
    }

    // 检查权限是否存在
    const existingPermission = await prisma.permission.findUnique({
      where: { id: permissionId }
    });

    if (!existingPermission) {
      return ResponseUtil.error('权限不存在', 404);
    }

    // 检查是否有角色使用此权限
    const roleCount = await prisma.rolePermission.count({
      where: { permissionId }
    });

    if (roleCount > 0) {
      return ResponseUtil.error(`无法删除权限，当前有 ${roleCount} 个角色使用此权限`);
    }

    // 删除权限
    await prisma.permission.delete({
      where: { id: permissionId }
    });

    return ResponseUtil.success(null, '权限删除成功');
  } catch (error) {
    console.error('删除权限失败:', error);
    return ResponseUtil.error('删除权限失败');
  } 
} 