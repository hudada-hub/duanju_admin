import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ResponseUtil } from '@/utils/response';

// 获取订单列表
export async function GET(request: Request) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const paymentMethod = searchParams.get('paymentMethod') || '';
    const userId = searchParams.get('userId') || '';

    // 构建查询条件
    const where: any = {};

    // 搜索条件
    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { title: { contains: search } },
        { user: { nickname: { contains: search } } },
        { user: { phone: { contains: search } } }
      ];
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 订单类型筛选（只处理Order表中的类型）
    if (type && type !== 'REGISTER') {
      where.type = type;
    }

    // 支付方式筛选
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    // 用户筛选
    if (userId) {
      where.userId = Number(userId);
    }

    // 计算分页
    const skip = (page - 1) * pageSize;

    // 如果查询注册订单，直接返回注册订单数据
    if (type === 'REGISTER') {
      // 构建注册订单查询条件
      const registerOrderWhere: any = {};
      if (search) {
        registerOrderWhere.OR = [
          { orderNo: { contains: search } },
          { nickname: { contains: search } },
          { phone: { contains: search } }
        ];
      }
      if (status) {
        registerOrderWhere.status = status;
      }
      
      // 查询注册订单
      const registerOrderCount = await prisma.registerOrder.count({ where: registerOrderWhere });
      const registerOrders = await prisma.registerOrder.findMany({
        where: registerOrderWhere,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: pageSize
      });
      
      // 转换注册订单格式以匹配订单格式
      const formattedRegisterOrders = registerOrders.map(ro => ({
        id: `register_${ro.id}`,
        orderNo: ro.orderNo,
        type: 'REGISTER',
        title: `注册订单 - ${ro.nickname}`,
        amount: Number(ro.amount),
        status: ro.status,
        paymentMethod: 'ALIPAY', // 注册订单默认支付宝
        paymentTime: ro.paymentTime,
        paymentNo: ro.paymentNo,
        createdAt: ro.createdAt,
        updatedAt: ro.updatedAt,
        expiredAt: ro.createdAt, // 注册订单没有过期时间，使用创建时间
        user: {
          id: 0,
          nickname: ro.nickname,
          phone: ro.phone,
          avatar: '/default-avatar.png'
        },
        remark: ro.remark
      }));
      
      return ResponseUtil.success({
        items: formattedRegisterOrders,
        total: registerOrderCount,
        page,
        pageSize,
        totalPages: Math.ceil(registerOrderCount / pageSize)
      });
    }
    
    // 查询普通订单
    const total = await prisma.order.count({ where });

    // 获取订单列表
    const orders = await prisma.order.findMany({
      where,
              include: {
          user: {
            select: {
              id: true,
              nickname: true,
              phone: true,
              avatar: true
            }
          }
        },
      orderBy: [
        { createdAt: 'desc' }
      ],
      skip,
      take: pageSize
    });

    return ResponseUtil.success({
      items: orders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return ResponseUtil.serverError('获取订单列表失败');
  } 
} 