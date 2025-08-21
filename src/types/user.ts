import { UserRole, UserStatus } from "@prisma/client";




// 用户列表项类型
export type UserListItem = {
  id: number;
  nickname: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  loginCount: number;
  createdAt: Date;
}

// 用户详情类型
export type UserDetail = {
  id: number;
  nickname: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 认证结果类型
export type AuthResult = {
  id: number;
  nickname: string;
  email: string;
  role: UserRole;
  token: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

// 管理员列表项类型
export type AdminListItem = {
  id: number;
  nickname: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
  loginCount: number;
  lastLoginIp: string | null;
}

// 创建管理员请求类型
export type CreateAdminRequest = {
  nickname: string;
  password: string;
  email?: string;
  role: UserRole;
  status?: UserStatus;
}

// 更新管理员请求类型
export type UpdateAdminRequest = {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
} 