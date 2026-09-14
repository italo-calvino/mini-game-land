const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('dist/client/index.html', 'utf8');

assert.match(html,/ゲームデータは、この端末の現在のブラウザ内に保存されます/);
assert.match(html,/レベル・ポイント・アイテムなどは復元できません/);

assert.match(
  html,
  /\['daily','achievements','ranking','challenge','more','collection'\]\.includes\(name\)/,
  '「その他」ページがページ切替の許可リストに含まれていること'
);
assert.match(html,/id="collection-page"/);
assert.match(html,/function renderCollectionPage\(\)/);
assert.match(html,/アイコン・称号・フレーム・BGM/);
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
