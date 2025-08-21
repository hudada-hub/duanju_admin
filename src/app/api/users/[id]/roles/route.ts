import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ResponseUtil } from '@/utils/response';
import { getUserFromToken } from '@/utils/server-auth';

// 检查用户是否有用户角色管理权限的辅助函数
async function checkUserRolePermission(userId: number, action: 'READ' | 'UPDATE') {
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
      rp.permission.resource === 'USER'
    )
  );
}

// 获取用户的角色列表
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

    // 检查是否有用户角色读取权限
    const hasReadPermission = await checkUserRolePermission(user.id, 'READ');
    if (user.role !== 'SUPER_ADMIN' && !hasReadPermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return ResponseUtil.error('无效的用户ID');
    }

    // 检查用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return ResponseUtil.error('用户不存在', 404);
    }

    // 查询用户的角色列表
    const userRoles = await prisma.userRoleRelation.findMany({
      where: { userId },
      include: {
        role: true
      },
      orderBy: { role: { name: 'asc' } }
    });

    // 查询所有可用角色
    const allRoles = await prisma.role.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' }
    });

    return ResponseUtil.success({
      user: targetUser,
      userRoles: userRoles.map(ur => ur.role),
      allRoles
    });
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return ResponseUtil.error('获取用户角色失败');
  } 
}

// 更新用户的角色
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

    // 检查是否有用户角色更新权限
    const hasUpdatePermission = await checkUserRolePermission(user.id, 'UPDATE');
    if (user.role !== 'SUPER_ADMIN' && !hasUpdatePermission) {
      return ResponseUtil.error('无权限访问', 403);
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return ResponseUtil.error('无效的用户ID');
    }

    const body = await request.json();
    const { roleIds } = body;

    if (!Array.isArray(roleIds)) {
      return ResponseUtil.error('角色ID列表格式错误');
    }

    // 检查用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return ResponseUtil.error('用户不存在', 404);
    }

    // 验证角色ID是否有效
    const validRoles = await prisma.role.findMany({
      where: {
        id: { in: roleIds },
        isEnabled: true
      }
    });

    if (validRoles.length !== roleIds.length) {
      return ResponseUtil.error('存在无效的角色ID');
    }

    // 使用事务更新用户角色
    await prisma.$transaction(async (tx) => {
      // 删除现有的用户角色关联
      await tx.userRoleRelation.deleteMany({
        where: { userId }
      });

      // 创建新的用户角色关联
      if (roleIds.length > 0) {
        await tx.userRoleRelation.createMany({
          data: roleIds.map(roleId => ({
            userId,
            roleId
          }))
        });
      }
    });

    return ResponseUtil.success(null, '用户角色更新成功');
  } catch (error) {
    console.error('更新用户角色失败:', error);
    return ResponseUtil.error('更新用户角色失败');
  } 
} 