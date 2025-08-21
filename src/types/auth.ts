// 登录响应数据类型
export interface LoginResponseData {
  token: string;
  user: {
    id: number;
    nickname: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

// 登录请求数据类型
export interface LoginRequest {
  nickname: string;
  password: string;
}