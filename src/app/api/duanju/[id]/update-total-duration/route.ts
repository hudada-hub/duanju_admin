import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request);
    if (!user?.id) {
      return ResponseUtil.unauthorized('请先登录');
    }

    const { id } = await params;
    const courseId = parseInt(id);

    // 检查课程是否存在且属于当前用户
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: courseId,
        uploaderId: user.id,
        isDeleted: false,
      },
    });

    if (!existingCourse) {
      return ResponseUtil.notFound('课程不存在或无权限修改');
    }

    // 计算所有子章节的总时长
    const totalDuration = await prisma.courseChapter.aggregate({
      where: {
        courseId: courseId,
        parentId: {
          not: null, // 只统计子章节
        },
        duration: {
          not: null,
        },
      },
      _sum: {
        duration: true,
      },
    });

    // 更新课程的总时长
    const updatedCourse = await prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        totalDuration: totalDuration._sum.duration || 0,
      },
    });

    return ResponseUtil.success({
      totalDuration: updatedCourse.totalDuration,
    });
  } catch (error) {
    console.error('更新课程总时长失败:', error);
    return ResponseUtil.error('更新课程总时长失败');
  }
} 