// generate_handover.js
const fs = require('fs');
const path = require('path');

const files = [
  'README.md',
  'SERVER_SETUP.md',
  'BUSINESS_STRATEGY.md',
  'CLAUDE.md',
  'CLAUDE_HANDOVER.md',
  'INTEGRATED_ROADMAP.md',
  'test_result.md'
];

const output = 'Audion_Handover_Complete.md';
const writeStream = fs.createWriteStream(output);

(async () => {
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️ ${file} が見つかりません。スキップします。`);
      continue;
    }
    const content = fs.readFileSync(file, 'utf-8');
    writeStream.write(`# ===== ${file} =====\n\n`);
    writeStream.write(content);
    writeStream.write(`\n\n---\n\n`);
  }
  writeStream.end();
  console.log(`✅ 引き継ぎドキュメント生成完了: ${output}`);
})();