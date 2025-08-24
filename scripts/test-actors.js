// 专门测试演员信息提取功能
const { parseFolderName } = require('./batch-create-shorts');

// 专门测试演员信息的测试用例
const actorTestCases = [
  // 标准格式测试
  {
    name: 'W-我在七零当机长太太（80集）朱傲宇＆蔡淼燕',
    expected: {
      title: '我在七零当机长太太',
      episodeCount: 80,
      actors: '朱傲宇＆蔡淼燕'
    }
  },
  
  // 用户提供的示例
  {
    name: '假千金作妖重生后我靠心声打脸（80集）赵禹喆&晓鱼',
    expected: {
      title: '假千金作妖重生后我靠心声打脸',
      episodeCount: 80,
      actors: '赵禹喆&晓鱼'
    }
  },
  
  // 三个演员测试
  {
    name: 'V-都市情感剧（60集）张三＆李四＆王五',
    expected: {
      title: '都市情感剧',
      episodeCount: 60,
      actors: '张三＆李四＆王五'
    }
  },
  
  // 半角&分隔符测试
  {
    name: 'X-古装剧（40集）演员A&演员B',
    expected: {
      title: '古装剧',
      episodeCount: 40,
      actors: '演员A&演员B'
    }
  },
  
  // 四个演员测试
  {
    name: 'Y-大制作（100集）主演A＆主演B＆主演C＆主演D',
    expected: {
      title: '大制作',
      episodeCount: 100,
      actors: '主演A＆主演B＆主演C＆主演D'
    }
  },
  
  // 无演员测试
  {
    name: 'Z-纪录片（20集）',
    expected: {
      title: '纪录片',
      episodeCount: 20,
      actors: ''
    }
  },
  
  // 复杂标题测试
  {
    name: 'W-我在七零年代当机长太太的日常（80集）朱傲宇＆蔡淼燕',
    expected: {
      title: '我在七零年代当机长太太的日常',
      episodeCount: 80,
      actors: '朱傲宇＆蔡淼燕'
    }
  },
  
  // 特殊字符测试
  {
    name: 'A-特殊测试（30集）演员@#$%^&*()',
    expected: {
      title: '特殊测试',
      episodeCount: 30,
      actors: '演员@#$%^&*()'
    }
  }
];

console.log('🎭 专门测试演员信息提取功能\n');

actorTestCases.forEach((testCase, index) => {
  console.log(`测试用例 ${index + 1}: ${testCase.name}`);
  console.log(`期望结果:`);
  console.log(`  标题: ${testCase.expected.title}`);
  console.log(`  集数: ${testCase.expected.episodeCount}集`);
  console.log(`  演员: ${testCase.expected.actors || '无'}`);
  
  try {
    const result = parseFolderName(testCase.name);
    console.log(`实际结果:`);
    console.log(`  标题: ${result.title}`);
    console.log(`  集数: ${result.episodeCount > 0 ? result.episodeCount + '集' : '未识别'}`);
    console.log(`  演员: ${result.actors || '未识别'}`);
    
    // 验证结果
    const titleMatch = result.title === testCase.expected.title;
    const episodeMatch = result.episodeCount === testCase.expected.episodeCount;
    const actorsMatch = result.actors === testCase.expected.actors;
    
    if (titleMatch && episodeMatch && actorsMatch) {
      console.log('  ✅ 测试通过');
    } else {
      console.log('  ❌ 测试失败');
      if (!titleMatch) console.log(`    标题不匹配: 期望"${testCase.expected.title}", 实际"${result.title}"`);
      if (!episodeMatch) console.log(`    集数不匹配: 期望${testCase.expected.episodeCount}, 实际${result.episodeCount}`);
      if (!actorsMatch) console.log(`    演员不匹配: 期望"${testCase.expected.actors}", 实际"${result.actors}"`);
    }
    
  } catch (error) {
    console.log(`  ❌ 解析失败: ${error.message}`);
  }
  
  console.log(''); // 空行分隔
});

console.log('✅ 演员信息提取测试完成！'); 