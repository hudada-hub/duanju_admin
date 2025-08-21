interface UserInfo {
  id: number;
  nickname: string;
  email: string;
  role: string;
  avatar: string;
}

// 检查是否在客户端环境
const isClient = () => {
  return typeof window !== 'undefined';
};

// 设置和获取 token 的函数
export const setUserAuth = (token: string, userInfo: UserInfo) => {
  if (isClient()) {
    localStorage.setItem('token', token);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }
};

export const getUserAuth = () => {
  if (!isClient()) {
    return {
      token: null,
      userInfo: null,
    };
  }
  
  const token = localStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo');
  return {
    token,
    userInfo: userInfo ? JSON.parse(userInfo) : null,
  };
};

export const clearUserAuth = () => {
  if (isClient()) {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
  }
};

export const isAuthenticated = () => {
  if (!isClient()) {
    return false;
  }
  return !!localStorage.getItem('token');
};

