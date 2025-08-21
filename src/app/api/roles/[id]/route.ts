import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { getUserFromToken } from '@/utils/server-auth';

// 检查用户是否有角色管理权限的辅助函数
async function checkRolePermission(userId: number, action: 'READ' | 'UPDATE' | 'DELETE') {
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

  // 检查是否有角色管理权限
  const hasRolePermission = userRoles.some(userRole =>
    userRole.role.rolePermissions.some(rp => 
      rp.permission.resource === 'ROLE'
    )
  );
  
  return hasRolePermission;
}

// 获取角色详情
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

    // 检查是否有角色读取权限
    const hasReadPermission = await checkRolePermission(user.id, 'READ');
    if (user.role !== 'SUPER_ADMIN' && !hasReadPermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return ResponseUtil.error('无效的角色ID');
    }

    // 查询角色详情
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true
          }
        },
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!role) {
      return ResponseUtil.error('角色不存在', 404);
    }

    return ResponseUtil.success(role);
  } catch (error) {
    console.error('获取角色详情失败:', error);
    return ResponseUtil.error('获取角色详情失败');
  } 
}

// 更新角色
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

    // 检查是否有角色更新权限
    const hasUpdatePermission = await checkRolePermission(user.id, 'UPDATE');
    if (user.role !== 'SUPER_ADMIN' && !hasUpdatePermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return ResponseUtil.error('无效的角色ID');
    }

    const body = await request.json();
    const { name, description, isEnabled } = body;

    // 验证必填字段
    if (!name) {
      return ResponseUtil.error('角色名称不能为空');
    }

    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!existingRole) {
      return ResponseUtil.error('角色不存在', 404);
    }

    // 检查角色名称是否已被其他角色使用
    if (name !== existingRole.name) {
      const nameExists = await prisma.role.findUnique({
        where: { name }
      });

      if (nameExists) {
        return ResponseUtil.error('角色名称已存在');
      }
    }

    // 更新角色
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        name,
        description,
        isEnabled
      }
    });

    return ResponseUtil.success(updatedRole, '角色更新成功');
  } catch (error) {
    console.error('更新角色失败:', error);
    return ResponseUtil.error('更新角色失败');
  } 
}

// 删除角色
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

    // 检查是否有角色删除权限
    const hasDeletePermission = await checkRolePermission(user.id, 'DELETE');
    if (user.role !== 'SUPER_ADMIN' && !hasDeletePermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return ResponseUtil.error('无效的角色ID');
    }

    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!existingRole) {
      return ResponseUtil.error('角色不存在', 404);
    }

    // 检查是否有用户使用此角色
    const userCount = await prisma.userRoleRelation.count({
      where: { roleId }
    });

    if (userCount > 0) {
      return ResponseUtil.error(`无法删除角色，当前有 ${userCount} 个用户使用此角色`);
    }

    // 删除角色（会自动删除相关的角色权限关联）
    await prisma.role.delete({
      where: { id: roleId }
    });

    return ResponseUtil.success(null, '角色删除成功');
  } catch (error) {
    console.error('删除角色失败:', error);
    return ResponseUtil.error('删除角色失败');
  } 
} 