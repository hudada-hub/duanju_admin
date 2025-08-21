import Link from 'next/link';
import { Button } from '../ui/button';

// 导航栏组件
const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <Link href="/home" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-gray-900">StarWiki</span>
            </Link>
          </div>

          {/* 导航链接 */}
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            <Link href="/home" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900">
              首页
            </Link>
            <Link href="/wikis" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900">
              Wiki列表
            </Link>
            <Link href="/apply-wiki" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900">
              申请Wiki
            </Link>
          </div>

          {/* 用户操作区 */}
          <div className="flex items-center">
            <Button variant="outline" className="mr-2">
              <Link href="/login">登录</Link>
            </Button>
            <Button>
              <Link href="/register">注册</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// 页脚组件
const Footer = () => {
  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 关于我们 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">关于我们</h3>
            <p className="mt-4 text-base text-gray-500">
              StarWiki是一个专注于游戏Wiki的平台，让玩家可以创建和分享游戏攻略、资料和经验。
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">快速链接</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/about" className="text-base text-gray-500 hover:text-gray-900">
                  关于我们
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-base text-gray-500 hover:text-gray-900">
                  联系我们
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-base text-gray-500 hover:text-gray-900">
                  服务条款
                </Link>
              </li>
            </ul>
          </div>

          {/* 联系方式 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">联系方式</h3>
            <ul className="mt-4 space-y-4">
              <li className="text-base text-gray-500">
                邮箱: contact@starwiki.com
              </li>
              <li className="text-base text-gray-500">
                地址: 中国上海市
              </li>
            </ul>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-base text-gray-400 text-center">
            &copy; {new Date().getFullYear()} StarWiki. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

// 主布局组件
export default function FrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
} 