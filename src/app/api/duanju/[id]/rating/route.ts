import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

// 获取用户对课程的评价
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userData = await verifyAuth(request);
    const user = userData?.user;
    if (!user?.id) {
      return ResponseUtil.error('请先登录');
    }

    const { id } = await params;
    const courseId = parseInt(id);
    const rating = await prisma.courseRating.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    });

    return ResponseUtil.success(rating);
  } catch (error) {
    console.error('获取课程评价失败:', error);
    return ResponseUtil.error('获取课程评价失败');
  }
}

// 提交课程评价
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userData = await verifyAuth(request);
    const user = userData?.user;
    if (!user?.id) {
      return ResponseUtil.error('请先登录');
    }

    const { id } = await params;
    const courseId = parseInt(id);
    const data = await request.json();

    // 验证评分范围
    const ratings = ['descriptionRating', 'valueRating', 'teachingRating'];
    for (const field of ratings) {
      const rating = data[field];
      if (rating < 1 || rating > 5) {
        return ResponseUtil.error(`${field} 评分必须在1-5之间`);
      }
    }

    // 检查课程是否存在
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return ResponseUtil.error('课程不存在');
    }

    // 创建或更新评价
    const rating = await prisma.courseRating.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      },
      update: {
        descriptionRating: data.descriptionRating,
        valueRating: data.valueRating,
        teachingRating: data.teachingRating,
        isAnonymous: data.isAnonymous || false
      },
      create: {
        userId: user.id,
        courseId,
        descriptionRating: data.descriptionRating,
        valueRating: data.valueRating,
        teachingRating: data.teachingRating,
        isAnonymous: data.isAnonymous || false
      }
    });

    return ResponseUtil.success(rating);
  } catch (error) {
    console.error('提交课程评价失败:', error);
    return ResponseUtil.error('提交课程评价失败');
  }
} 