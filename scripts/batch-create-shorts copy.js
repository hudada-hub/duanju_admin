const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 配置信息
const CONFIG = {
  API_BASE_URL: 'http://localhost:3001/api',
  TOKEN: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmlja25hbWUiOiJhZG1pbiIsInJvbGUiOiJTVVBFUl9BRE1JTiIsImlzQWRtaW4iOnRydWUsImF2YXRhciI6Imh0dHBzOi8vc3R1ZHktcGxhdGZvcm0tMTI1ODczOTM0OS5jb3MuYXAtZ3Vhbmd6aG91Lm15cWNsb3VkLmNvbS91cGxvYWRzL2ltYWdlcy8yMDI1LzA4LzAzLzBjZDc2YWFiLTUzMDItNGQ3OC04YzZlLWU4Y2IxZDA5ZDU4OC5qcGVnIiwiaWF0IjoxNzU1Njk2NTg2LCJleHAiOjE3NTYzMDEzODZ9.cSwuhrh2PnTIwRKmdgWb-emhkey9T_P3KyrI64GRUSA',
  VIDEO_PATH: 'E:\\video',
  // 使用随机数生成1-3的范围
  getRandomCategoryId: () => Math.floor(Math.random() * 3) + 1,
  getRandomDirectionId: () => 1,
  // 随机选择状态：COMPLETED 或 ONGOING
  getRandomStatus: () => Math.random() < 0.5 ? 'COMPLETED' : 'ONGOING',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// 创建axios实例
const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Authorization': CONFIG.TOKEN,
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
 * 智能解析文件夹名，提取短剧信息
 * @param {string} folderName 文件夹名称
 * @returns {Object} 解析结果
 */
function parseFolderName(folderName) {
  const result = {
    title: '',
    episodeCount: 0,
    actors: '',
    originalName: folderName
  };

  try {
    // 移除前缀（如 W-、V- 等）
    let cleanName = folderName.replace(/^[A-Z]-/, '');
    
    // 提取集数信息 (数字+集)
    const episodeMatch = cleanName.match(/（(\d+)集）/);
    if (episodeMatch) {
      result.episodeCount = parseInt(episodeMatch[1]);
      
      // 找到集数在字符串中的位置
      const episodeIndex = cleanName.indexOf(episodeMatch[0]);
      
      // 集数前面的部分作为标题
      result.title = cleanName.substring(0, episodeIndex).trim();
      
      // 集数后面的所有文字作为演员信息
      const afterEpisode = cleanName.substring(episodeIndex + episodeMatch[0].length).trim();
      result.actors = afterEpisode;
      
    } else {
      // 如果没有集数信息，整个名称作为标题
      result.title = cleanName.trim();
    }
    
    // 如果标题为空，使用原始名称
    if (!result.title) {
      result.title = folderName;
    }
    
    // 清理标题中的特殊字符
    result.title = result.title
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 移除特殊字符
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim();
    
    // 限制标题长度
    if (result.title.length > 50) {
      result.title = result.title.substring(0, 50) + '...';
    }
    
  } catch (error) {
    console.error(`解析文件夹名失败: ${folderName}`, error);
    // 如果解析失败，使用原始名称
    result.title = folderName;
  }
  
  return result;
}

/**
 * 生成短剧标题
 * @param {string} folderName 文件夹名称
 * @returns {string}
 */
function generateTitle(folderName) {
  const parsed = parseFolderName(folderName);
  return parsed.title;
}

/**
 * 生成短剧描述
 * @param {string} folderName 文件夹名称
 * @param {number} videoCount 视频数量
 * @returns {string}
 */
function generateDescription(folderName, videoCount) {
  const parsed = parseFolderName(folderName);
  
  let description = `这是一个关于"${parsed.title}"的短剧系列`;
  
  if (parsed.episodeCount > 0) {
    description += `，共${parsed.episodeCount}集`;
  } else if (videoCount > 0) {
    description += `，共包含${videoCount}个视频章节`;
  }
  
  if (parsed.actors.length > 0) {
    description += `。主演：${parsed.actors}`;
  }
  
  description += '。内容精彩，值得观看！';
  
  return description;
}

/**
 * 生成演员信息
 * @param {string} folderName 文件夹名称
 * @returns {string}
 */
function generateActors(folderName) {
  const parsed = parseFolderName(folderName);
  return parsed.actors.length > 0 ? parsed.actors : '导演';
}

/**
 * 生成封面URL
 * @param {string} folderName 文件夹名称
 * @returns {string} 封面URL
 */
function generateCoverUrl(folderName) {
  // 移除前缀（如 W-、V-、Q- 等）

  // 构建封面URL：基础URL + 文件夹名 + /0.jpg
  return `https://duanju-1258739349.cos.ap-guangzhou.myqcloud.com/${folderName}/0.jpg`;
}

/**
 * 扫描文件夹下的视频文件
 * @param {string} folderPath 文件夹路径
 * @returns {Array} 视频文件列表，按文件名排序
 */
function scanVideoFiles(folderPath) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(folderPath)) {
      console.log(`   文件夹不存在: ${folderPath}`);
      return [];
    }
    
    const files = fs.readdirSync(folderPath);
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'].includes(ext);
    });
    
    // 按文件名排序（数字在前）
    videoFiles.sort((a, b) => {
      const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });
    
    return videoFiles;
  } catch (error) {
    console.error(`   扫描视频文件失败: ${error.message}`);
    return [];
  }
}

/**
 * 创建短剧章节
 * @param {Object} shortData 短剧数据
 * @param {Array} videoFiles 视频文件列表
 * @returns {Array} 创建的章节列表
 */
async function createShortChapters(shortData, videoFiles) {
  if (!videoFiles || videoFiles.length === 0) {
    console.log(`   没有找到视频文件，跳过章节创建`);
    return [];
  }
  
  console.log(`   找到 ${videoFiles.length} 个视频文件，开始创建章节...`);
  
  const chapters = [];
  
  for (let i = 0; i < videoFiles.length; i++) {
    const videoFile = videoFiles[i];
    const chapterData = {
      title: `第${i + 1}集`,
      description: `${shortData.title} 第${i + 1}集`,
      videoUrl: `https://duanju-1258739349.cos.ap-guangzhou.myqcloud.com/${shortData.originalFolderName}/${videoFile}`,
      coverUrl: `https://duanju-1258739349.cos.ap-guangzhou.myqcloud.com/${shortData.originalFolderName}/${videoFile.replace(/\.[^/.]+$/, '.jpg')}`, // 视频对应的封面
      points: Math.floor(Math.random() * 50) + 10, // 10-60积分随机
      sort: i + 1,
      duration: Math.floor(Math.random() * 30) + 20 // 20-50分钟随机时长
    };
    
    try {
      const response = await apiClient.post(`/shorts/${shortData.shortsId}/chapters`, chapterData);
      console.log(`     ✅ 章节创建成功: ${chapterData.title} (ID: ${response.data.data?.id || 'unknown'})`);
      chapters.push(response.data.data);
    } catch (error) {
      console.error(`     ❌ 章节创建失败: ${chapterData.title}`, error.message);
    }
    
    // 请求间隔
    if (i < videoFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms间隔
    }
  }
  
  return chapters;
}

/**
 * 创建短剧
 * @param {Object} shortData 短剧数据
 * @param {number} retryCount 重试次数
 * @returns {Object} 创建结果
 */
async function createShort(shortData, retryCount = 0) {
  try {
    console.log(`正在创建短剧: ${shortData.title}`);
    
    const response = await apiClient.post('/shorts', shortData);
    
    console.log(`✅ 短剧创建成功: ${shortData.title} (ID: ${response.data.data?.id || 'unknown'})`);
    
    // 创建短剧成功后，创建章节
    if (response.data.data?.id) {
      const shortId = response.data.data.id;
      const folderPath = path.join(CONFIG.VIDEO_PATH, shortData.originalFolderName);
      const videoFiles = scanVideoFiles(folderPath);
      
      // 创建章节
      const chapters = await createShortChapters({
        ...shortData,
        id: shortId,
        originalFolderName: shortData.originalFolderName
      }, videoFiles);
      
      console.log(`📚 章节创建完成: ${chapters.length}/${videoFiles.length} 个章节`);
    }
    
    return response.data.data;
  } catch (error) {
    console.error(`❌ 短剧创建失败: ${shortData.title}`, error.message);
    
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`   重试中... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      return createShort(shortData, retryCount + 1);
    }
    
    throw error;
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
    const shortData = generateShortData(dir);
 
    // 创建短剧
    const result = await createShort(shortData);
    
    // 记录结果
    if (result) { // createShort now returns the data on success
      results.success++;
      results.details.push({
        folder: dir.name,
        status: 'success',
        data: result
      });
    } else {
      results.failed++;
      results.details.push({
        folder: dir.name,
        status: 'failed',
        error: 'Unknown error' // Error message is now logged inside createShort
      });
    }

    // 请求间隔
    if (i < directories.length - 1) {
      console.log(`等待 ${CONFIG.RETRY_DELAY}ms 后继续...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
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
    console.log(`🌐 API地址: ${CONFIG.API_BASE_URL}`);
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
      const parsed = parseFolderName(dir.name);
      
      if (dir.hasVideoFiles) {
        console.log(`  ${status} ${dir.name}`);
        console.log(`     标题: ${parsed.title}`);
        if (parsed.episodeCount > 0) {
          console.log(`     集数: ${parsed.episodeCount}集`);
        }
        if (parsed.actors.length > 0) {
          console.log(`     演员: ${parsed.actors}`);
        }
        console.log(`     视频文件: ${dir.videoCount}个`);
      } else {
        console.log(`  ${status} ${dir.name} (无视频文件)`);
      }
      console.log(''); // 空行分隔
    });
 
    // 询问是否继续
    console.log('\n是否继续创建短剧？(y/n)');
    // 注意：在Node.js环境中，这里需要手动输入
    // 为了自动化，我们直接继续执行
    
    // 批量创建短剧
    const results = await batchCreateShorts(directories);
    console.log(results);
    return;
 
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
  createShort,
  parseFolderName
};

