'use client';

import { useEffect, useState } from 'react';
import { 
  UsersIcon, 
  BookOpenIcon,
  DocumentCheckIcon,
  ClockIcon,
  UserPlusIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  VideoCameraIcon,
  ShoppingCartIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  BriefcaseIcon,
  BanknotesIcon,
  CurrencyYenIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { Line, Column, Pie } from '@ant-design/plots';
import AdminLayout from '@/app/components/layout/AdminLayout';
import { request } from '@/utils/request';
import { hasUserManagementPermission } from '@/utils/client-permission';
import dayjs from 'dayjs';
import { Spin, Card, Tabs, message } from 'antd';
import { useRouter } from 'next/navigation';

// 定义统计卡片类型
type StatCard = {
  name: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  change: number;
  trend: 'up' | 'down';
};

interface DashboardData {
  stats: StatCard[];
 
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([
    // 用户相关统计
    { 
      name: '总用户数', 
      value: 0, 
      icon: UsersIcon,
      change: 0,
      trend: 'up'
    },
    { 
      name: '今日活跃', 
      value: 0, 
      icon: ClockIcon,
      change: 0,
      trend: 'up'
    },
    { 
      name: '今日注册', 
      value: 0, 
      icon: UserPlusIcon,
      change: 0,
      trend: 'up'
    },
    // 文章相关统计
    { 
      name: '文章总数', 
      value: 0, 
      icon: DocumentTextIcon,
      change: 0,
      trend: 'up'
    },
    { 
      name: '文章评论', 
      value: 0, 
      icon: ChatBubbleLeftIcon,
      change: 0,
      trend: 'up'
    },
    // 短剧相关统计
    { 
      name: '短剧总数', 
      value: 0, 
      icon: VideoCameraIcon,
      change: 0,
      trend: 'up'
    },
    { 
      name: '短剧订单', 
      value: 0, 
      icon: ShoppingCartIcon,
      change: 0,
      trend: 'up'
    },
   
  ]);

  const router = useRouter();
  
 
  // 获取统计数据
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await request<DashboardData>('/dashboard/stats', {
        method: 'GET',
      });
      if (response.code === 0 && response.data) {
        const { stats: newStats } = response.data;
        setStats(stats.map((stat, index) => ({
          ...stat,
          value: newStats[index].value,
          change: parseFloat(String(newStats[index].change)),
          trend: newStats[index].trend,
        })));
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // 设置定时刷新，每5分钟更新一次数据
    const timer = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUsersClick = async () => {
    try {
      const hasPermission = await hasUserManagementPermission();
      if (hasPermission) {
        router.push('/users');
      } else {
        message.warning('您没有权限访问用户管理页面。');
      }
    } catch (error) {
      console.error('权限检查失败:', error);
      message.error('权限检查失败，请稍后重试。');
    }
  };

  // 处理其他统计卡片的点击
  const handleStatClick = (statName: string) => {
    const routeMap: { [key: string]: string } = {
      '文章总数': '/articles',
      '文章评论': '/article-comments',
      '短剧总数': '/shorts',
      '短剧订单': '/shorts-orders',
      '帖子总数': '/forum-posts',
      '任务总数': '/tasks',
      '今日可结算任务': '/task-settlement',
      '今日注册': '/users',
      '今日活跃': '/users',
      '今日学习': '/shorts'
    };

    const route = routeMap[statName];
    if (route) {
      router.push(route);
    }
  };

  return (
    <AdminLayout>
      <Spin spinning={loading}>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">仪表盘</h1>
              <p className="mt-2 text-sm text-gray-700">
                查看网站的关键指标和统计数据
              </p>
            </div>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-white text-gray-700 rounded-md shadow hover:bg-gray-50"
            >
              刷新数据
            </button>
          </div>

          {/* 统计卡片网格 */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card
                key={stat.name}
                className="hover:shadow-lg transition-shadow duration-300"
                onClick={stat.name === '总用户数' ? handleUsersClick : () => handleStatClick(stat.name)}
                style={{ cursor: stat.name === '总用户数' ? 'pointer' : 'pointer' }}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-500">
                      {stat.name}
                    </div>
                    <div className="mt-1 flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      {stat.change !== 0 && (
                        <div className={`ml-2 flex items-center text-sm font-semibold ${
                          stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.trend === 'up' ? (
                            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                          )}
                          {Math.abs(stat.change)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

        
          
        </div>
      </Spin>
    </AdminLayout>
  );
}