import { request } from './request';

// 客户端权限检查
export async function checkClientPermission(resource: string): Promise<boolean> {
  try {
    const response = await request<{ accessible?: boolean; pages?: string[] }>(`/user/accessible-pages?resource=${resource}`, {
      method: 'GET',
    });
    
    if (response.code === 0 && response.data) {
      // 如果返回的是accessible字段（特定资源权限检查）
      if (response.data.accessible !== undefined) {
        return response.data.accessible;
      }
      
      // 如果返回的是pages字段（所有可访问页面）
      if (response.data.pages) {
        // 检查是否包含SUPER_ADMIN或指定资源
        return response.data.pages.includes('SUPER_ADMIN') || response.data.pages.includes(resource);
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查客户端权限失败:', error);
    return false;
  }
}

// 检查用户是否有用户管理权限
export async function hasUserManagementPermission(): Promise<boolean> {
  return checkClientPermission('USER');
} 