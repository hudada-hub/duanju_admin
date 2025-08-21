'use client';

import Sidebar from './Sidebar'
import Header from './Header'
interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 左侧边栏 */}
      <Sidebar />
   
      {/* 右侧内容区 */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* 顶部导航栏 */}
        <Header />
        
        {/* 主要内容区 */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      
      
    </div>
  );
} 