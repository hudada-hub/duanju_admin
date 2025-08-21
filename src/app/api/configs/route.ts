import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/utils/server-auth';

// 获取配置列表
export async function GET(request: Request) {
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

    const configs = await prisma.config.findMany({
      orderBy: {
        sort: 'asc'
      },
      include: {
        textValue: true,
        imageValue: true,
        multiImageValues: {
          orderBy: {
            sort: 'asc'
          }
        },
        multiTextValues: {
          orderBy: {
            sort: 'asc'
          }
        },
        multiContentValues: {
          orderBy: {
            sort: 'asc'
          }
        }
      }
    });

    // 格式化返回数据
    const formattedConfigs = configs.map(config => {
      let value = '';
      switch (config.type) {
        case 'TEXT':
        case 'TEXTAREA':
          value = config.textValue?.value || '';
          break;
        case 'IMAGE':
          value = config.imageValue?.url || '';
          break;
        case 'MULTI_IMAGE':
          value = JSON.stringify(config.multiImageValues.map(item => item.url));
          break;
        case 'MULTI_TEXT':
          value = JSON.stringify(config.multiTextValues.map(item => ({
            title: item.title,
            content: item.content,
            link: item.link
          })));
          break;
        case 'MULTI_CONTENT':
          value = JSON.stringify(config.multiContentValues.map(item => ({
            title: item.title,
            content: item.content,
            imageUrl: item.imageUrl,
            link: item.link
          })));
          break;
        case 'RICH_TEXT':
          value = config.textValue?.value || '';
          break;
      }

      return {
        id: config.id,
        title: config.title,
        key: config.key,
        type: config.type,
        description: config.description,
        sort: config.sort,
        isEnabled: config.isEnabled,
        value
      };
    });

    return NextResponse.json({
      code: 0,
      message: '获取成功',
      data: formattedConfigs
    });
  } catch (error) {
    console.error('获取配置列表失败:', error);
    return NextResponse.json({
      code: 500,
      message: '获取配置列表失败',
      data: null
    } , { status: 500 });
  }
}

// 创建配置
export async function POST(request: Request) {
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

    const body = await request.json();
    const { title, key, type, description, sort = 0, isEnabled = true, value } = body;

    // 验证必要字段
    if (!title || !key || !type) {
      return NextResponse.json({
        code: 400,
        message: '缺少必要字段',
        data: null
      }, { status: 400 });
    }

    // 检查键名是否已存在
    const existingConfig = await prisma.config.findUnique({
      where: { key }
    });

    if (existingConfig) {
      return NextResponse.json({
        code: 400,
        message: '键名已存在',
        data: null
      }, { status: 400 });
    }

    // 创建配置
    const config = await prisma.config.create({
      data: {
        title,
        key,
        type,
        description,
        sort,
        isEnabled
      }
    });

    // 根据类型创建对应的值
    switch (type) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'RICH_TEXT':
        await prisma.configTextValue.create({
          data: {
            configId: config.id,
            value: value || ''
          }
        });
        break;
      case 'IMAGE':
        await prisma.configImageValue.create({
          data: {
            configId: config.id,
            url: value || ''
          }
        });
        break;
      case 'MULTI_IMAGE':
        const imageUrls = JSON.parse(value || '[]');
        await prisma.configMultiImageValue.createMany({
          data: imageUrls.map((url: string, index: number) => ({
            configId: config.id,
            url,
            sort: index
          }))
        });
        break;
      case 'MULTI_TEXT':
      case 'MULTI_CONTENT':
        const items = JSON.parse(value || '[]');
        if (type === 'MULTI_TEXT') {
          await prisma.configMultiTextValue.createMany({
            data: items.map((item: any, index: number) => ({
              configId: config.id,
              title: item.title,
              content: item.content,
              link: item.link,
              sort: index
            }))
          });
        } else {
          await prisma.configMultiContentValue.createMany({
            data: items.map((item: any, index: number) => ({
              configId: config.id,
              title: item.title,
              content: item.content,
              imageUrl: item.url,
              link: item.link,
              sort: index
            }))
          });
        }
        break;
    }

    return NextResponse.json({
      code: 0,
      message: '创建成功',
      data: {
        ...config,
        value
      }
    });
  } catch (error) {
    console.error('创建配置失败:', error);
    return NextResponse.json({
      code: 500,
      message: '创建配置失败',
      data: null
    } , { status: 500 });
  }
} 