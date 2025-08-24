// 测试文件夹名解析功能
const { parseFolderName } = require('./batch-create-shorts');

// 测试用例
const testCases = [
  'W-我在七零当机长太太（80集）朱傲宇＆蔡淼燕',
  'V-都市之最强医仙（120集）张三＆李四',
  'X-古装宫廷剧（60集）王五',
  'Y-现代都市情感剧（40集）赵六＆钱七＆孙八',
  'Z-科幻冒险（100集）',
  '普通文件夹名',
  'W-特殊字符@#$%^&*()（50集）演员A＆演员B',
  '（30集）前缀测试',
  '后缀演员测试（20集）演员C＆演员D',
  '无集数信息演员测试演员E＆演员F',
  'W-测试短剧（25集）演员1&演员2',  // 测试半角&分隔符
  'V-另一个测试（35集）演员A＆演员B＆演员C',  // 测试三个演员
  'X-简单测试（15集）',  // 测试只有集数没有演员
  'Y-复杂测试（45集）主演A＆主演B＆主演C＆主演D',  // 测试四个演员
  '假千金作妖重生后我靠心声打脸（80集）赵禹喆&晓鱼'  // 用户提供的示例
];

console.log('🧪 测试文件夹名解析功能\n');

testCases.forEach((testCase, index) => {
  console.log(`测试用例 ${index + 1}: ${testCase}`);
  
  try {
    const result = parseFolderName(testCase);
    console.log(`  解析结果:`);
    console.log(`    标题: ${result.title}`);
    console.log(`    集数: ${result.episodeCount > 0 ? result.episodeCount + '集' : '未识别'}`);
    console.log(`    演员: ${result.actors || '未识别'}`);
    console.log(`    原始名: ${result.originalName}`);
  } catch (error) {
    console.log(`  解析失败: ${error.message}`);
  }
  
  console.log(''); // 空行分隔
});

console.log('✅ 测试完成！'); 