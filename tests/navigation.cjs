const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('dist/client/index.html', 'utf8');

assert.match(
  html,
  /\['daily','achievements','ranking','challenge','more'\]\.includes\(name\)/,
  '「その他」ページがページ切替の許可リストに含まれていること'
);
assert.match(
  html,
  /profileBtn\.textContent=saveData\.profile\?\.avatar\|\|'🎮'/,
  '右上のプロフィールボタンにはアイコンだけを表示すること'
);
assert.doesNotMatch(
  html,
  /profileBtn\.textContent=`\$\{saveData\.profile\?\.avatar[^;]+username/,
  '右上の丸いボタンへユーザー名を表示しないこと'
);

console.log('PASS: more navigation and compact profile button');
