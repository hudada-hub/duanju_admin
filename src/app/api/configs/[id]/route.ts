import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/utils/server-auth';

// 更新配置
export async function PUT(request: Request, { params }: { params: Promise<{ id: number }> }) {
  try {
    // 验证用户身份
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({
        code: 401,
        message: '未登录或登录已过期',
        data: null
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, type, description, sort, isEnabled, value } = body;

    // 验证必要字段
    if (!title || !type) {
      return NextResponse.json({
        code: 400,
        message: '缺少必要字段',
        data: null
      }, { status: 400 });
    }

    // 更新配置基本信息
    const config = await prisma.config.update({
      where: { id: Number(id) },
      data: {
        title,
        type,
        description,
        sort,
        isEnabled
      }
    });

    // 根据类型更新对应的值
    switch (type) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'RICH_TEXT':
        await prisma.configTextValue.upsert({
          where: { configId: Number(id) },
          create: {
            configId: Number(id),
            value: value || ''
          },
          update: {
            value: value || ''
          }
        });
        break;
      case 'IMAGE':
        await prisma.configImageValue.upsert({
          where: { configId: Number(id) },
          create: {
            configId: Number(id)    ,
            url: value || ''
          },
          update: {
            url: value || ''
          }
        });
        break;
      case 'MULTI_IMAGE':
        // 删除旧的值
        await prisma.configMultiImageValue.deleteMany({
          where: { configId: Number(id) }
        });
        // 创建新的值
        const imageUrls = JSON.parse(value || '[]');
        if (imageUrls.length > 0) {
          await prisma.configMultiImageValue.createMany({
            data: imageUrls.map((url: string, index: number) => ({
              configId: Number(id),
              url,
              sort: index
            }))
          });
        }
        break;
      case 'MULTI_TEXT':
      case 'MULTI_CONTENT':
        const items = JSON.parse(value || '[]');
        if (type === 'MULTI_TEXT') {
          // 删除旧的值
          await prisma.configMultiTextValue.deleteMany({
            where: { configId: Number(id) }
          });
          // 创建新的值
          if (items.length > 0) {
            await prisma.configMultiTextValue.createMany({
              data: items.map((item: any, index: number) => ({
                configId: Number(id),
                title: item.title,
                content: item.content,
                link: item.link,
                sort: index
              }))
            });
          }
        } else {
          // 删除旧的值
          await prisma.configMultiContentValue.deleteMany({
            where: { configId: Number(id) }
          });
          // 创建新的值
          if (items.length > 0) {
            await prisma.configMultiContentValue.createMany({
              data: items.map((item: any, index: number) => ({
                configId: Number(id),
                title: item.title,
                content: item.content,
                imageUrl: item.url,
                link: item.link,
                sort: index
              }))
            });
          }
        }
        break;
    }

    return NextResponse.json({
      code: 0,
      message: '更新成功',
      data: {
        ...config,
        value
      }
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    return NextResponse.json({
      code: 500,
      message: '更新配置失败',
      data: null
    } , { status: 500 });
  }
}

// 删除配置
export async function DELETE(request: Request, { params }: { params: Promise<{ id: number }> }) {
  try {
    // 验证用户身份
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({
        code: 401,
        message: '未登录或登录已过期',
        data: null
      }, { status: 401 });
    }

    const { id } = await params;

    // 删除配置（关联的值会自动删除，因为我们设置了 onDelete: Cascade）
    await prisma.config.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({
      code: 0,
      message: '删除成功',
      data: null
    });
  } catch (error) {
    console.error('删除配置失败:', error);
    return NextResponse.json({
      code: 500,
      message: '删除配置失败',
      data: null
    } , { status: 500 });
  }
}

// 更新配置状态
export async function PATCH(request: Request, { params }: { params: Promise<{ id: number }> }) {
  try {
    // 验证用户身份
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({
        code: 401,
        message: '未登录或登录已过期',
        data: null
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isEnabled } = body;

    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json({
        code: 400,
        message: '无效的状态值',
        data: null
      }, { status: 400 });
    }

    const config = await prisma.config.update({
      where: { id: Number(id) },
      data: { isEnabled }
    });

    return NextResponse.json({
      code: 0,
      message: '更新成功',
      data: config
    });
  } catch (error) {
    console.error('更新配置状态失败:', error);
    return NextResponse.json({
      code: 500,
      message: '更新配置状态失败',
      data: null
    } , { status: 500 });
  }
} 