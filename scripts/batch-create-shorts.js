const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 配置信息
const CONFIG = {
  API_BASE_URL: 'http://localhost:3200',
  API_ENDPOINT: '/api/shorts',
  AUTHORIZATION_TOKEN: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmlja25hbWUiOiJhZG1pbiIsInJvbGUiOiJTVVBFUl9BRE1JTiIsImFzQWRtaW4iOnRydWUsImF2YXRhciI6Imh0dHBzOi8vc3R1ZHktcGxhdGZvcm0tMTI1ODczOTM0OS5jb3MuYXAtZ3Vhbmd6aG91Lm15cWNsb3VkLmNvbS91cGxvYWRzL2ltYWdlcy8yMDI1LzA4LzAzLzBjZDc2YWFiLTUzMDItNGQ3OC04YzZlLWU4Y2IxZDA5ZDU4OC5qcGVnIiwiaWF0IjoxNzU1NzkxNTMxLCJleHAiOjE3NTYzOTYzMzF9.-7-ge3_JeMsDKF_HchBuNcZScMYKfpeI_fdkfzm_QOg',
  VIDEO_PATH: 'E:\\video',
  DEFAULT_COVER_URL: 'https://duanju-1258739349.cos.ap-guangzhou.myqcloud.com/uploads/images/2025/08/24/700786aa-0381-4716-8e75-321dd03758e6.jpeg',
  DEFAULT_CATEGORY_ID: 3,
  DEFAULT_DIRECTION_ID: 1,
  DEFAULT_STATUS: 'COMPLETED',
  DELAY_BETWEEN_REQUESTS: 1000, // 请求间隔（毫秒）
  MAX_RETRIES: 3 // 最大重试次数
};

// 创建axios实例
const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Authorization': CONFIG.AUTHORIZATION_TOKEN,
    'Content-Type': 'application/json'
  }
});

/**
 * 扫描目录下的所有文件夹
 * @param {string} dirPath 目录路径
 * @returns {Array} 文件夹信息数组
 */
function scanDirectories(dirPath) {
  console.log(`开始扫描目录: ${dirPath}`);
  
  try {
    const items = fs.readdirSync(dirPath);
    const directories = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 检查是否包含视频文件
        const hasVideoFiles = checkForVideoFiles(fullPath);
        
        directories.push({
          name: item,
          path: fullPath,
          hasVideoFiles,
          videoCount: hasVideoFiles ? countVideoFiles(fullPath) : 0
        });
      }
    }
    
    console.log(`找到 ${directories.length} 个文件夹`);
    return directories;
    
  } catch (error) {
    console.error(`扫描目录失败: ${error.message}`);
    return [];
  }
}

/**
 * 检查目录是否包含视频文件
 * @param {string} dirPath 目录路径
 * @returns {boolean}
 */
function checkForVideoFiles(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
    
    return items.some(item => {
      const ext = path.extname(item).toLowerCase();
      return videoExtensions.includes(ext);
    });
  } catch (error) {
    return false;
  }
}

/**
 * 统计目录中的视频文件数量
 * @param {string} dirPath 目录路径
 * @returns {number}
 */
function countVideoFiles(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
    
    return items.filter(item => {
      const ext = path.extname(item).toLowerCase();
      return videoExtensions.includes(ext);
    }).length;
  } catch (error) {
    return 0;
  }
}

/**
 * 生成短剧标题
 * @param {string} folderName 文件夹名称
 * @returns {string}
 */
function generateTitle(folderName) {
  // 清理文件夹名称，移除特殊字符
  let title = folderName
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 移除特殊字符
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
  
  // 如果标题为空，使用默认标题
  if (!title) {
    title = `短剧_${Date.now()}`;
  }
  
  // 限制标题长度
  if (title.length > 50) {
    title = title.substring(0, 50) + '...';
  }
  
  return title;
}

/**
 * 生成短剧描述
 * @param {string} folderName 文件夹名称
 * @param {number} videoCount 视频数量
 * @returns {string}
 */
function generateDescription(folderName, videoCount) {
  return `这是一个关于"${folderName}"的短剧系列，共包含${videoCount}个视频章节。内容精彩，值得观看！`;
}

/**
 * 调用API创建短剧
 * @param {Object} shortData 短剧数据
 * @param {number} retryCount 重试次数
 * @returns {Promise}
 */
async function createShort(shortData, retryCount = 0) {
  try {
    console.log(`正在创建短剧: ${shortData.title}`);
    
    const response = await apiClient.post(CONFIG.API_ENDPOINT, shortData);
    
    console.log(`✅ 短剧创建成功: ${shortData.title} (ID: ${response.data.data?.id || 'unknown'})`);
    return {
      success: true,
      data: response.data,
      title: shortData.title
    };
    
  } catch (error) {
    console.error(`❌ 创建短剧失败: ${shortData.title}`);
    
    if (error.response) {
      console.error(`   HTTP状态: ${error.response.status}`);
      console.error(`   错误信息: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      console.error(`   网络错误: ${error.message}`);
    } else {
      console.error(`   其他错误: ${error.message}`);
    }
    
    // 重试逻辑
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`   重试中... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
      return createShort(shortData, retryCount + 1);
    }
    
    return {
      success: false,
      error: error.message,
      title: shortData.title
    };
  }
}

/**
 * 批量创建短剧
 * @param {Array} directories 文件夹信息数组
 */
async function batchCreateShorts(directories) {
  console.log('\n开始批量创建短剧...');
  console.log(`总共需要处理 ${directories.length} 个文件夹\n`);
  
  const results = {
    total: directories.length,
    success: 0,
    failed: 0,
    details: []
  };
  
  for (let i = 0; i < directories.length; i++) {
    const dir = directories[i];
    
    if (!dir.hasVideoFiles) {
      console.log(`⏭️  跳过文件夹 (无视频文件): ${dir.name}`);
      results.details.push({
        folder: dir.name,
        status: 'skipped',
        reason: '无视频文件'
      });
      continue;
    }
    
    console.log(`\n[${i + 1}/${directories.length}] 处理文件夹: ${dir.name}`);
    
    // 生成短剧数据
    const shortData = {
      title: generateTitle(dir.name),
      instructor: '导演', // 可以根据需要修改
      categoryId: CONFIG.DEFAULT_CATEGORY_ID,
      directionId: CONFIG.DEFAULT_DIRECTION_ID,
      status: CONFIG.DEFAULT_STATUS,
      description: generateDescription(dir.name, dir.videoCount),
      coverUrl: CONFIG.DEFAULT_COVER_URL
    };
    
    // 创建短剧
    const result = await createShort(shortData);
    
    // 记录结果
    if (result.success) {
      results.success++;
      results.details.push({
        folder: dir.name,
        status: 'success',
        data: result.data
      });
    } else {
      results.failed++;
      results.details.push({
        folder: dir.name,
        status: 'failed',
        error: result.error
      });
    }
    
    // 请求间隔
    if (i < directories.length - 1) {
      console.log(`等待 ${CONFIG.DELAY_BETWEEN_REQUESTS}ms 后继续...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
    }
  }
  
  return results;
}

/**
 * 生成报告
 * @param {Object} results 批量处理结果
 */
function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('批量创建短剧完成！');
  console.log('='.repeat(60));
  console.log(`总计: ${results.total} 个文件夹`);
  console.log(`成功: ${results.success} 个`);
  console.log(`失败: ${results.failed} 个`);
  console.log(`跳过: ${results.total - results.success - results.failed} 个`);
  
  if (results.failed > 0) {
    console.log('\n失败详情:');
    results.details
      .filter(item => item.status === 'failed')
      .forEach(item => {
        console.log(`  ❌ ${item.folder}: ${item.error}`);
      });
  }
  
  // 保存详细报告到文件
  const reportPath = path.join(__dirname, `batch-create-shorts-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n详细报告已保存到: ${reportPath}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 短剧批量创建脚本启动');
    console.log(`📁 扫描路径: ${CONFIG.VIDEO_PATH}`);
    console.log(`🌐 API地址: ${CONFIG.API_BASE_URL}${CONFIG.API_ENDPOINT}`);
    console.log('');
    
    // 检查目录是否存在
    if (!fs.existsSync(CONFIG.VIDEO_PATH)) {
      console.error(`❌ 目录不存在: ${CONFIG.VIDEO_PATH}`);
      return;
    }
    
    // 扫描目录
    const directories = scanDirectories(CONFIG.VIDEO_PATH);
    
    if (directories.length === 0) {
      console.log('没有找到任何文件夹');
      return;
    }
    
    // 显示扫描结果
    console.log('\n扫描结果:');
    directories.forEach((dir, index) => {
      const status = dir.hasVideoFiles ? '✅' : '⏭️';
      console.log(`  ${status} ${dir.name} (视频: ${dir.videoCount}个)`);
    });
    
    // 询问是否继续
    console.log('\n是否继续创建短剧？(y/n)');
    // 注意：在Node.js环境中，这里需要手动输入
    // 为了自动化，我们直接继续执行
    
    // 批量创建短剧
    const results = await batchCreateShorts(directories);
    
    // 生成报告
    generateReport(results);
    
  } catch (error) {
    console.error('脚本执行失败:', error);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  scanDirectories,
  batchCreateShorts,
  createShort
}; 