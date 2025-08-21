import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResponseUtil } from '@/utils/response';
import { verifyAuth } from '@/utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return ResponseUtil.error('无效的用户ID');
    }

    // 验证当前用户登录状态
    const authResult = await verifyAuth(request);
    if (!authResult?.user?.id) {
      return ResponseUtil.unauthorized('未登录');
    }

    // 获取用户发布的帖子
    const posts = await prisma.forumPost.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
        status: { not: 'REJECTED' } // 排除已拒绝的帖子
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        viewCount: true,
        commentCount: true,
        likeCount: true,
        isTop: true,
        isEssence: true,
        isHot: true,
        author: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        section: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            comments: true,
            favorites: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 格式化数据
    const formattedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      status: post.status,
      viewCount: post.viewCount,
      commentCount: post.commentCount,
      likeCount: post.likeCount,
      isTop: post.isTop,
      isEssence: post.isEssence,
      isHot: post.isHot,
      author: {
        id: post.author.id,
        nickname: post.author.nickname,
        avatar: post.author.avatar
      },
      section: {
        id: post.section.id,
        name: post.section.name
      },
      totalComments: post._count.comments,
      totalFavorites: post._count.favorites
    }));

    return ResponseUtil.success({
      list: formattedPosts,
      total: formattedPosts.length
    });

  } catch (error) {
    console.error('获取用户帖子失败:', error);
    return ResponseUtil.error('获取用户帖子失败');
  }
} 