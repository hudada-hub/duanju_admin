import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { getUserFromToken } from '@/utils/server-auth';

// 检查用户是否有角色权限管理权限的辅助函数
async function checkRolePermissionPermission(userId: number, action: 'READ' | 'UPDATE') {
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
      rp.permission.resource === 'ROLE_PERMISSION'
    )
  );
}

// 获取角色的权限列表
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

    // 检查是否有角色权限读取权限
    const hasReadPermission = await checkRolePermissionPermission(user.id, 'READ');
    if (user.role !== 'SUPER_ADMIN' && !hasReadPermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return ResponseUtil.error('无效的角色ID');
    }

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return ResponseUtil.error('角色不存在', 404);
    }

    // 查询角色的权限列表
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true
      },
      orderBy: [
        { permission: { resource: 'asc' } }
      ]
    });

    // 查询所有可用权限
    const allPermissions = await prisma.permission.findMany({
      where: { isEnabled: true },
      orderBy: [{ resource: 'asc' }]
    });

    return ResponseUtil.success({
      role,
      rolePermissions: rolePermissions.map(rp => rp.permission),
      allPermissions
    });
  } catch (error) {
    console.error('获取角色权限失败:', error);
    return ResponseUtil.error('获取角色权限失败');
  } 
}

// 更新角色的权限
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

    // 检查是否有角色权限更新权限
    const hasUpdatePermission = await checkRolePermissionPermission(user.id, 'UPDATE');
    if (user.role !== 'SUPER_ADMIN' && !hasUpdatePermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return ResponseUtil.error('无效的角色ID');
    }

    const body = await request.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return ResponseUtil.error('权限ID列表格式错误');
    }

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return ResponseUtil.error('角色不存在', 404);
    }

    // 验证权限ID是否有效
    const validPermissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        isEnabled: true
      }
    });

    if (validPermissions.length !== permissionIds.length) {
      return ResponseUtil.error('存在无效的权限ID');
    }

    // 使用事务更新角色权限
    await prisma.$transaction(async (tx) => {
      // 删除现有的角色权限关联
      await tx.rolePermission.deleteMany({
        where: { roleId }
      });

      // 创建新的角色权限关联
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({
            roleId,
            permissionId
          }))
        });
      }
    });

    return ResponseUtil.success(null, '角色权限更新成功');
  } catch (error) {
    console.error('更新角色权限失败:', error);
    return ResponseUtil.error('更新角色权限失败');
  } 
} 