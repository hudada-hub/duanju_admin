import {PrismaClient, UserRole, UserStatus} from '@prisma/client';
import * as argon2 from 'argon2';
import prisma from '@/lib/prisma';

async function main() {
  try {
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        nickname: 'admin',
        password: await argon2.hash('123456'),
        email: 'admin@example.com',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        phone: '13800138000',
      },
    });
    
    console.log('管理员用户创建成功:', admin);
  } catch (error) {
    console.error('创建管理员用户失败:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

