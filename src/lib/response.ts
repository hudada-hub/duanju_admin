// src/utils/response.ts

import { NextResponse } from 'next/server';

// 响应状态码枚举
export enum ResponseCode {
  SUCCESS = 0,           // 成功
  ERROR = 1,            // 一般错误
  UNAUTHORIZED = 401,    // 未授权
  FORBIDDEN = 403,       // 禁止访问
  NOT_FOUND = 404,       // 未找到
  SERVER_ERROR = 500,    // 服务器错误
}

// 响应接口
interface ResponseData<T = any> {
  code: ResponseCode;
  message?: string;
  data?: T;
}

export class ResponseUtil {
  // 成功响应
  static success<T>(data?: T, message: string = '操作成功') {
    return NextResponse.json({
      code: ResponseCode.SUCCESS,
      message,
      data,
    });
  }

  // 错误响应
  static error(message: string = '操作失败', code: ResponseCode = ResponseCode.ERROR) {
    return NextResponse.json({
      code,
      message,
    });
  }

  // 未授权响应
  static unauthorized(message: string = '未授权') {
    return NextResponse.json({
      code: ResponseCode.UNAUTHORIZED,
      message,
    }, { status: 401 });
  }

  // 禁止访问响应
  static forbidden(message: string = '无权限') {
    return NextResponse.json({
      code: ResponseCode.FORBIDDEN,
      message,
    }, { status: 403 });
  }

  // 资源不存在响应
  static notFound(message: string = '资源不存在') {
    return NextResponse.json({
      code: ResponseCode.NOT_FOUND,
      message,
    }, { status: 404 });
  }

  // 服务器错误响应
  static serverError(message: string = '服务器错误') {
    return NextResponse.json({
      code: ResponseCode.SERVER_ERROR,
      message,
    }, { status: 500 });
  }
}