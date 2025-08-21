import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 定义不需要验证的路由
const publicRoutes = [
  '/login',
  '/api/login',
  '/api/register',
  '/_next',
  '/favicon.ico',
];

// 检查是否是公开路由
function isPublicRoute(pathname: string) {
  return publicRoutes.some(route => pathname.startsWith(route));
}

// 从请求头获取token
function getTokenFromHeader(request: NextRequest): string | null {
  let authorization = request.headers.get('Authorization');
  if (!authorization) {
    authorization = request.cookies.get('token')?.value || null;
  }

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.split(' ')[1];
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 如果是公开路由，直接放行
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 从请求头获取token
  const token = getTokenFromHeader(request);
 

  // // 如果没有token，返回未认证错误
  // if (!token) {
  //   // 如果是API请求，返回401错误
  //   if (pathname.startsWith('/api/')) {
  //     return NextResponse.json({
  //       code: 401,
  //       message: '未登录',
  //       data: null,
  //     }, { 
  //       status: 401,
  //       headers: {
  //         'WWW-Authenticate': 'Bearer'
  //       }
  //     });
  //   }
    
  //   // 如果是页面请求，重定向到登录页
  //   // const url = new URL('/login', request.url);
  //   // url.searchParams.set('redirect', encodeURIComponent(pathname));
  //   // return NextResponse.redirect(url);
  // }

  // 如果有token，继续处理请求
  const response = NextResponse.next();
  
  
  
  return response;
}

// 配置需要进行中间件处理的路由
export const config = {
  matcher: [
    /*
     * 匹配所有路由，除了：
     * - api 路由 (/_next/static, /_next/image)
     * - static 文件 (/favicon.ico, /site.webmanifest)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 