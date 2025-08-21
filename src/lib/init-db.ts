import prisma from '@/lib/prisma';

/**
 * 检查并初始化数据库
 * 只在数据库为空时执行初始化
 */
export async function initDatabase() {
  try {
    console.log('检查数据库状态...');
    
    // 检查数据库中是否已有数据
    const existingPermissions = await prisma.permission.count();
    const existingRoles = await prisma.role.count();
    
    if (existingPermissions > 0 && existingRoles > 0) {
      console.log('数据库中已有数据，跳过初始化');
      return;
    }
    
    console.log('数据库为空，开始初始化权限和角色...');
    
    // 创建权限 - 基于页面级别，不需要操作类型
    const permissions = [
      { name: '仪表盘', description: '仪表盘页面访问权限', resource: 'DASHBOARD' },
      { name: '文章管理', description: '文章管理页面访问权限', resource: 'ARTICLE' },
      { name: '文章评论', description: '文章评论管理页面访问权限', resource: 'ARTICLE_COMMENT' },
      { name: '文章分类', description: '文章分类管理页面访问权限', resource: 'ARTICLE_CATEGORY' },
      { name: '短剧管理', description: '短剧管理页面访问权限', resource: 'COURSE' },
      { name: '短剧分类', description: '短剧分类管理页面访问权限', resource: 'COURSE_CATEGORY' },
      { name: '短剧方向', description: '短剧方向管理页面访问权限', resource: 'COURSE_DIRECTION' },
      { name: '短剧评论', description: '短剧评论管理页面访问权限', resource: 'COURSE_COMMENT' },
      { name: '短剧订单', description: '短剧订单管理页面访问权限', resource: 'COURSE_ORDER' },
      { name: '视频管理', description: '视频管理页面访问权限', resource: 'VIDEO' },
      { name: '视频分类', description: '视频分类管理页面访问权限', resource: 'VIDEO_CATEGORY' },
      { name: '视频评论', description: '视频评论管理页面访问权限', resource: 'VIDEO_COMMENT' },
      { name: '论坛分类', description: '论坛板块分类管理页面访问权限', resource: 'FORUM_CATEGORY' },
      { name: '论坛板块', description: '论坛板块管理页面访问权限', resource: 'FORUM_SECTION' },
      { name: '论坛帖子', description: '论坛帖子管理页面访问权限', resource: 'FORUM_POST' },
      { name: '论坛评论', description: '论坛帖子评论管理页面访问权限', resource: 'FORUM_COMMENT' },
      { name: '评论举报', description: '论坛评论举报管理页面访问权限', resource: 'FORUM_COMMENT_REPORT' },
      { name: '帖子举报', description: '论坛帖子举报管理页面访问权限', resource: 'FORUM_POST_REPORT' },
      { name: '接单管理', description: '接单平台管理页面访问权限', resource: 'TASK' },
      { name: '接单分类', description: '接单分类管理页面访问权限', resource: 'TASK_CATEGORY' },
      { name: '接单评论', description: '接单评论管理页面访问权限', resource: 'TASK_COMMENT' },
      { name: '接单订单', description: '接单订单管理页面访问权限', resource: 'TASK_ORDER' },
      { name: '游戏管理', description: '游戏管理页面访问权限', resource: 'GAME' },
      { name: '游戏分类', description: '游戏分类管理页面访问权限', resource: 'GAME_CATEGORY' },
      { name: '游戏题库', description: '游戏题库管理页面访问权限', resource: 'GAME_QUESTION' },
      { name: '用户管理', description: '用户管理页面访问权限', resource: 'USER' },
      { name: '管理员管理', description: '管理员管理页面访问权限', resource: 'ADMIN' },
      { name: '角色管理', description: '角色管理页面访问权限', resource: 'ROLE' },
      { name: '权限管理', description: '权限管理页面访问权限', resource: 'PERMISSION' },
      { name: '订单管理', description: '订单管理页面访问权限', resource: 'ORDER' },
      { name: '网站配置', description: '网站配置页面访问权限', resource: 'CONFIG' },
      { name: '任务结算', description: '任务结算页面访问权限', resource: 'TASK_SETTLEMENT' },
    ];

    // 创建权限记录
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: permission,
        create: permission,
      });
    }

    console.log('权限创建完成');

    // 创建角色
    const roles = [
      { name: '超级管理员', description: '超级管理员，拥有所有权限' },
      { name: '系统管理员', description: '系统管理员，管理用户、角色、权限' },
      { name: '内容管理员', description: '内容管理员，管理文章、短剧、视频、论坛' },
      { name: '论坛管理员', description: '论坛管理员，专门管理论坛相关内容' },
      { name: '接单管理员', description: '接单平台管理员，管理接单相关业务' },
      { name: '游戏管理员', description: '游戏管理员，管理游戏和题库' },
      { name: '客服人员', description: '客服人员，查看用户信息和订单' },
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: role,
        create: role,
      });
    }

    console.log('角色创建完成');

    // 为超级管理员分配所有权限
    const superAdminRole = await prisma.role.findUnique({ where: { name: '超级管理员' } });
    const allPermissions = await prisma.permission.findMany();

    if (superAdminRole) {
      for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // 为系统管理员分配系统管理权限
    const systemAdminRole = await prisma.role.findUnique({ where: { name: '系统管理员' } });
    if (systemAdminRole) {
      const systemPermissions = await prisma.permission.findMany({
        where: {
          resource: { in: ['USER', 'ADMIN', 'ROLE', 'PERMISSION', 'CONFIG', 'DASHBOARD'] }
        }
      });
      
      for (const permission of systemPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: systemAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: systemAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // 为内容管理员分配内容管理权限
    const contentAdminRole = await prisma.role.findUnique({ where: { name: '内容管理员' } });
    if (contentAdminRole) {
      const contentPermissions = await prisma.permission.findMany({
        where: {
          resource: { in: ['ARTICLE', 'ARTICLE_COMMENT', 'ARTICLE_CATEGORY', 'COURSE', 'COURSE_CATEGORY', 'COURSE_DIRECTION', 'COURSE_COMMENT', 'COURSE_ORDER', 'VIDEO', 'VIDEO_CATEGORY', 'VIDEO_COMMENT', 'DASHBOARD'] }
        }
      });
      
      for (const permission of contentPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: contentAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: contentAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // 为论坛管理员分配论坛管理权限
    const forumAdminRole = await prisma.role.findUnique({ where: { name: '论坛管理员' } });
    if (forumAdminRole) {
      const forumPermissions = await prisma.permission.findMany({
        where: {
          resource: { in: ['FORUM_CATEGORY', 'FORUM_SECTION', 'FORUM_POST', 'FORUM_COMMENT', 'FORUM_COMMENT_REPORT', 'FORUM_POST_REPORT', 'DASHBOARD'] }
        }
      });
      
      for (const permission of forumPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: forumAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: forumAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // 为接单管理员分配接单管理权限
    const taskAdminRole = await prisma.role.findUnique({ where: { name: '接单管理员' } });
    if (taskAdminRole) {
      const taskPermissions = await prisma.permission.findMany({
        where: {
          resource: { in: ['TASK', 'TASK_CATEGORY', 'TASK_COMMENT', 'TASK_ORDER', 'DASHBOARD'] }
        }
      });
      
      for (const permission of taskPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: taskAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: taskAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // 为游戏管理员分配游戏管理权限
    const gameAdminRole = await prisma.role.findUnique({ where: { name: '游戏管理员' } });
    if (gameAdminRole) {
      const gamePermissions = await prisma.permission.findMany({
        where: {
          resource: { in: ['GAME', 'GAME_CATEGORY', 'GAME_QUESTION', 'DASHBOARD'] }
        }
      });
      
      for (const permission of gamePermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: gameAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: gameAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // 为客服人员分配客服相关权限
    const supportRole = await prisma.role.findUnique({ where: { name: '客服人员' } });
    if (supportRole) {
      const supportPermissions = await prisma.permission.findMany({
        where: {
          resource: { in: ['USER', 'ORDER', 'COURSE_ORDER', 'TASK_ORDER', 'DASHBOARD'] }
        }
      });
      
      for (const permission of supportPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: supportRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: supportRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    console.log('角色权限分配完成');
    console.log('数据库初始化完成！');

  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase() {
  // 不需要手动关闭连接，让 Prisma 自己管理
} 
 


