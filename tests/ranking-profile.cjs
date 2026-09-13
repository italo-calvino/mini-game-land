const fs=require('node:fs'),assert=require('node:assert/strict');
const server=fs.readFileSync('dist/server/index.js','utf8');
const client=fs.readFileSync('dist/client/index.html','utf8');
assert.match(server,/LEFT JOIN player_profiles AS profile ON profile\.player_id = ranked\.player_id/);
assert.match(server,/COALESCE\(profile\.avatar, ranked\.avatar\) AS avatar/);
assert.match(client,/syncOnlineProfile\(\)\.then\(\(\)=>renderLocalRanking\(rankingGame\)\)/);
assert.doesNotMatch(server,/\/api\/cloud-save/);
assert.doesNotMatch(client,/onclick="open(?:Save|Load)\(\)"/);
console.log('PASS: current profile avatar drives rankings; cloud save/restore removed');
