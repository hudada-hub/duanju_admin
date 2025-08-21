'use client';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo, useEffect, useState } from 'react';
import { 
  HomeIcon, 
  UsersIcon, 
  BookOpenIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  DocumentTextIcon,
  FolderIcon,
  ChatBubbleLeftIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import { request } from '@/utils/request';

// 定义菜单项类型
interface MenuItem {
  name: string;
  href?: string;
  icon?: any;
  children?: MenuItem[];
  resource?: string; // 添加资源标识符
}

// 定义菜单项
const menuItems: MenuItem[] = [
  { 
    name: '仪表盘', 
    href: '/dashboard', 
    icon: HomeIcon,
    resource: 'DASHBOARD'
  },
  {
    name: '文章模块',
    icon: DocumentTextIcon,
    resource: 'ARTICLE',
    children: [
      { name: '文章管理', href: '/articles', resource: 'ARTICLE' },
      { name: '文章评论', href: '/article-comments', resource: 'ARTICLE_COMMENT' },
      { name: '文章分类', href: '/article-categories', resource: 'ARTICLE_CATEGORY' },
    ]
  },
  {
    name: '短剧视频',
    icon: VideoCameraIcon,
    resource: 'COURSE',
    children: [
      { name: '短剧管理', href: '/courses', resource: 'COURSE' },
      { name: '短剧分类', href: '/course-categories', resource: 'COURSE_CATEGORY' },
      { name: '短剧方向', href: '/course-directions', resource: 'COURSE_DIRECTION' },
      { name: '短剧评论', href: '/course-comments', resource: 'COURSE_COMMENT' },
      { name: '短剧订单', href: '/course-orders', resource: 'COURSE_ORDER' },
    ]
  },
 
  

  {
    name: '系统管理',
    icon: Cog6ToothIcon,
    resource: 'USER',
    children: [
      { name: '用户管理', href: '/users', resource: 'USER' },
      { name: '管理员管理', href: '/admins', resource: 'ADMIN' },
      { name: '角色管理', href: '/roles', resource: 'ROLE' },
      { name: '订单管理', href: '/orders', resource: 'ORDER' },
      { name: '网站配置', href: '/config', resource: 'CONFIG' },
    ]
  },
];

// 将我们的菜单项转换为 Antd Menu 需要的格式
const convertToAntdMenuItems = (items: MenuItem[]): MenuProps['items'] => {
  return items.map((item, index) => {
    const Icon = item.icon;
    const menuItem = {
      key: item.href || String(index),
      icon: Icon ? <Icon className="h-5 w-5" /> : null,
      label: item.name,
      children: item.children ? convertToAntdMenuItems(item.children) : undefined
    };
    return menuItem;
  });
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [accessiblePages, setAccessiblePages] = useState<string[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 添加状态来管理菜单展开状态
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // 获取用户可访问的页面
  useEffect(() => {
    const fetchAccessiblePages = async () => {
      try {
        setIsLoading(true);
        const response = await request('/user/accessible-pages');
        if (response.code === 0 && response.data) {
          // 处理返回的数据格式
          let pages: string[] = [];
          if (Array.isArray(response.data)) {
            // 如果直接返回数组
            pages = response.data;
          } else if (response.data.pages && Array.isArray(response.data.pages)) {
            // 如果返回的是包含pages字段的对象
            pages = response.data.pages;
          }
          
          setAccessiblePages(pages);
          
          // 如果是超级管理员，确保有足够的权限数据
          if (pages.includes('SUPER_ADMIN')) {
            console.log('检测到超级管理员，显示所有菜单');
          }
        } else {
          console.error('获取可访问页面失败:', response);
          // 如果获取失败，默认显示所有菜单
          setAccessiblePages(['DASHBOARD', 'USER', 'ADMIN', 'ROLE', 'PERMISSION', 'COURSE', 'ARTICLE', 'FORUM', 'TASK', 'GAME', 'ORDER', 'CONFIG']);
        }
      } catch (error) {
        console.error('获取可访问页面失败:', error);
        // 如果获取失败，默认显示所有菜单
        setAccessiblePages(['DASHBOARD', 'USER', 'ADMIN', 'ROLE', 'PERMISSION', 'COURSE', 'ARTICLE', 'FORUM', 'TASK', 'GAME', 'ORDER', 'CONFIG']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccessiblePages();
  }, []);

  // 根据权限过滤菜单项
  useEffect(() => {
    const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
      return items.filter(item => {
        // 检查是否为超级管理员
        const isSuperAdmin = accessiblePages.includes('SUPER_ADMIN');
        
        // 如果是超级管理员，直接显示所有菜单项
        if (isSuperAdmin) {
          // 递归处理子菜单
          if (item.children) {
            item.children = filterMenuItems(item.children);
          }
          return true;
        }

        // 检查主菜单项是否有权限
        if (item.resource && !accessiblePages.includes(item.resource)) {
          return false;
        }

        // 检查子菜单项
        if (item.children) {
          const filteredChildren = filterMenuItems(item.children);
          if (filteredChildren.length === 0) {
            return false;
          }
          item.children = filteredChildren;
        }

        return true;
      });
    };

    if (accessiblePages.length > 0) {
      const filtered = filterMenuItems([...menuItems]);
      setFilteredMenuItems(filtered);
    }
  }, [accessiblePages]);

  // 初始化展开状态 - 根据当前路径自动展开对应的父菜单
  useEffect(() => {
    if (filteredMenuItems.length > 0) {
      const newOpenKeys: string[] = [];
      filteredMenuItems.forEach((item, index) => {
        if (item.children?.some(child => child.href === pathname)) {
          newOpenKeys.push(String(index));
        }
      });
      // 只设置新的展开项，保持现有的展开状态
      setOpenKeys(prev => {
        const combined = [...new Set([...prev, ...newOpenKeys])];
        return combined;
      });
    }
  }, [pathname, filteredMenuItems]);

  // 使用 useMemo 缓存菜单项计算
  const antdMenuItems = useMemo(() => {
    // 如果正在加载或没有权限数据，返回空数组（隐藏所有菜单）
    if (isLoading || accessiblePages.length === 0) {
      return [];
    }
    return convertToAntdMenuItems(filteredMenuItems);
  }, [filteredMenuItems, isLoading, accessiblePages]);

  // 使用 useMemo 缓存选中的菜单项
  const selectedKeys = useMemo(() => {
    return [pathname];
  }, [pathname]);

  // 处理菜单点击
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    router.push(key);
  };

  // 处理菜单展开/收起
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
      {/* Logo区域 */}
      <div className="flex h-16 items-center justify-center border-b">
        <Link href="/dashboard" className="text-xl font-bold text-gray-800">
          短剧管理系统
        </Link>
      </div>

      {/* 菜单区域 */}
      <div className="mt-6">
        {isLoading ? (
          // 加载状态显示加载提示
          <div className="flex items-center justify-center p-4">
           
          </div>
        ) : accessiblePages.length === 0 ? (
          // 没有权限时显示提示
          <div className="flex items-center justify-center p-4">
            <div className="text-gray-500">暂无访问权限</div>
          </div>
        ) : (
          // 有权限时显示菜单
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onOpenChange={handleOpenChange}
            items={antdMenuItems}
            onClick={handleMenuClick}
            style={{ border: 'none' }}
            className="h-[calc(100vh-4rem)] overflow-y-auto"
          />
        )}
      </div>
    </div>
  );
} 