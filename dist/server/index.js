const GAME_IDS = new Set([
  'memory','reaction','quiz','blackjack','solitaire','hangman','slide','roulette',
  'shiritori','tetris','breakout','trivia','monster','runner','shooting',
  'minesweeper','myquiz','animequiz','slot','pinball','snake','aimtrainer',
  'simon','typing','sokoban','reversi','lightsout','pong','fighter'
]);
const AVATARS = new Set(['🎮','🙂','🐣','🦊','🐱','🐶','🐼','🐸','🤖','👻','🧙','🥷','🐉','👑','👾','🚀']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function getRankings(request, env) {
  const url = new URL(request.url);
  const gameId = cleanText(url.searchParams.get('gameId'), 32);
  const rulesVersion = Math.max(1, Math.min(100, Number(url.searchParams.get('rulesVersion')) || 1));
  if (!GAME_IDS.has(gameId)) return json({ error: 'Unknown game' }, 400);

  const result = await env.DB.prepare(
    `SELECT player_id, username, avatar, score, played_at
     FROM (
       SELECT player_id, username, avatar, score, played_at,
              ROW_NUMBER() OVER (
                PARTITION BY player_id
                ORDER BY score DESC, played_at ASC
              ) AS player_rank
       FROM scores
       WHERE game_id = ? AND rules_version = ?
     )
     WHERE player_rank = 1
     ORDER BY score DESC, played_at ASC
     LIMIT 10`
  ).bind(gameId, rulesVersion).all();

  return json({
    rows: (result.results || []).map((row) => ({
      playerId: row.player_id,
      username: row.username,
      avatar: row.avatar,
      score: row.score,
      playedAt: row.played_at
    }))
  });
}

async function saveScore(request, env) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 4096) return json({ error: 'Request too large' }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const playerId = cleanText(body.playerId, 80);
  const username = cleanText(body.username, 16);
  const avatar = AVATARS.has(body.avatar) ? body.avatar : '🎮';
  const gameId = cleanText(body.gameId, 32);
  const score = Math.round(Number(body.score));
  const rulesVersion = Math.round(Number(body.rulesVersion));
  const durationMs = Math.max(0, Math.min(86400000, Math.round(Number(body.durationMs) || 0)));
  const won = body.won ? 1 : 0;

  if (
    playerId.length < 8 || username.length < 1 || /[<>]/.test(username) ||
    !GAME_IDS.has(gameId) || !Number.isSafeInteger(score) || score < 0 ||
    score > 1000000000 || !Number.isInteger(rulesVersion) ||
    rulesVersion < 1 || rulesVersion > 100
  ) {
    return json({ error: 'Invalid score' }, 400);
  }

  const id = crypto.randomUUID();
  const playedAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO scores
      (id, player_id, username, avatar, game_id, score, won, played_at, duration_ms, rules_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, playerId, username, avatar, gameId, score, won, playedAt, durationMs, rulesVersion).run();

  return json({ ok: true }, 201);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/api/rankings') {
        return await getRankings(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/scores') {
        return await saveScore(request, env);
      }
      if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ error: 'Server error' }, 500);
    }
  }
};

