import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 从请求中获取 token
export const getTokenFromRequest = (request: Request): string | null => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
  
    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) return null;
  
    return token;
  };
  
  // 从 token 中获取用户信息并验证
  export async function getUserFromToken(request: NextRequest | Request): Promise<User | null> {
    try {
      // 从请求头获取 token
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      
      // 验证 token
      const user = jwt.verify(token, JWT_SECRET) as User;
      
      console.log(user);
  


      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }
  
  // 中间件函数，用于验证请求是否已认证
  export const requireAuth = async (request: Request): Promise<Response | null> => {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({
          code: 401,
          message: '未登录或登录已过期',
          data: null
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  
    return null;
  };
  
  // 检查用户角色权限
  export const checkRole = (user: User, allowedRoles: string[]): boolean => {
    return allowedRoles.includes(user.role);
  };
  
  // 中间件函数，用于验证用户角色
  export const requireRole = async (
    request: Request,
    allowedRoles: string[]
  ): Promise<Response | null> => {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({
          code: 401,
          message: '未登录或登录已过期',
          data: null
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  
    if (!checkRole(user, allowedRoles)) {
      return new Response(
        JSON.stringify({
          code: 403,
          message: '没有权限执行此操作',
          data: null
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  
    return null;
  };