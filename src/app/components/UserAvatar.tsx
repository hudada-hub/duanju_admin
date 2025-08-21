// src/app/components/UserAvatar.tsx
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { getUserAuth, clearUserAuth } from '@/utils/client-auth';

const UserAvatar: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userInfo = getUserAuth().userInfo;

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearUserAuth();
    window.location.reload();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
          {userInfo?.avatar ? (
            <img
              src={userInfo.avatar}
              alt={userInfo.nickname}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{userInfo?.nickname.charAt(0).toUpperCase()}</span>
          )}
        </div>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            {userInfo?.nickname}
          </div>
          <a
            href="/user/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            个人资料
          </a>
          <a
            href="/user/settings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            账号设置
          </a>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;