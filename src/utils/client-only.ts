// 客户端专用工具，避免SSR问题

// 检查是否在客户端环境
export const isClient = () => {
  return typeof window !== 'undefined';
};

// 安全的SweetAlert2导入
export const getSwal = () => {
  if (isClient()) {
    return require('sweetalert2').default;
  }
  return null;
};

// 安全的localStorage访问
export const getLocalStorage = () => {
  if (isClient()) {
    return localStorage;
  }
  return null;
};

// 安全的sessionStorage访问
export const getSessionStorage = () => {
  if (isClient()) {
    return sessionStorage;
  }
  return null;
}; 