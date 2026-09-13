const GAME_IDS = new Set([
  'memory','reaction','quiz','blackjack','solitaire','hangman','slide','roulette',
  'shiritori','tetris','breakout','trivia','monster','runner','shooting',
  'minesweeper','animequiz','slot','pinball','snake','aimtrainer',
  'simon','typing','sokoban','reversi','lightsout','pong','fighter'
]);
const AVATARS = new Set(['🎮','🙂','🐣','🦊','🐱','🐶','🐼','🐸','🤖','👻','🧙','🥷','🐉','👑','👾','🚀','🐹','🐰','🐧','🐵','🐙','🦁','🦄','🦈','🦖','🧛','🧚','🌠','💠']);
let playerProfilesReady = null;

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

async function ensurePlayerProfiles(env) {
  if (!playerProfilesReady) {
    playerProfilesReady = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS player_profiles (
        player_id text PRIMARY KEY NOT NULL,
        username text NOT NULL,
        avatar text DEFAULT '🎮' NOT NULL,
        level integer DEFAULT 1 NOT NULL,
        total_points integer DEFAULT 0 NOT NULL,
        updated_at text NOT NULL
      )`),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_player_profiles_level ON player_profiles (level, total_points)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_player_profiles_points ON player_profiles (total_points, level)')
    ]).catch((error) => {
      playerProfilesReady = null;
      throw error;
    });
  }
  return playerProfilesReady;
}

async function getRankings(request, env) {
  const url = new URL(request.url);
  const type = cleanText(url.searchParams.get('type'), 16) || 'game';
  if (type === 'level' || type === 'points') {
    await ensurePlayerProfiles(env);
    const order = type === 'level'
      ? 'level DESC, total_points DESC, updated_at ASC'
      : 'total_points DESC, level DESC, updated_at ASC';
    const result = await env.DB.prepare(
      `SELECT player_id, username, avatar, level, total_points, updated_at
       FROM player_profiles
       ORDER BY ${order}
       LIMIT 10`
    ).all();
    return json({
      type,
      rows: (result.results || []).map((row) => ({
        playerId: row.player_id,
        username: row.username,
        avatar: row.avatar,
        level: row.level,
        totalPoints: row.total_points,
        updatedAt: row.updated_at
      }))
    });
  }
  if (type !== 'game') return json({ error: 'Unknown ranking type' }, 400);
  const gameId = cleanText(url.searchParams.get('gameId'), 32);
  const rulesVersion = Math.max(1, Math.min(100, Number(url.searchParams.get('rulesVersion')) || 1));
  if (!GAME_IDS.has(gameId)) return json({ error: 'Unknown game' }, 400);
  await ensurePlayerProfiles(env);

  const result = await env.DB.prepare(
    `SELECT ranked.player_id,
            COALESCE(profile.username, ranked.username) AS username,
            COALESCE(profile.avatar, ranked.avatar) AS avatar,
            ranked.score, ranked.played_at
     FROM (
       SELECT player_id, username, avatar, score, played_at,
              ROW_NUMBER() OVER (
                PARTITION BY player_id
                ORDER BY score DESC, played_at ASC
              ) AS player_rank
       FROM scores
       WHERE game_id = ? AND rules_version = ?
     ) AS ranked
     LEFT JOIN player_profiles AS profile ON profile.player_id = ranked.player_id
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

function parsePlayerProfile(body) {
  const playerId = cleanText(body.playerId, 80);
  const username = cleanText(body.username, 16);
  const avatar = AVATARS.has(body.avatar) ? body.avatar : '🎮';
  const level = Math.round(Number(body.level));
  const totalPoints = Math.round(Number(body.totalPoints));
  if (
    playerId.length < 8 || username.length < 1 || /[<>]/.test(username) ||
    !Number.isInteger(level) || level < 1 || level > 1000 ||
    !Number.isSafeInteger(totalPoints) || totalPoints < 0 || totalPoints > 1000000000
  ) return null;
  return { playerId, username, avatar, level, totalPoints, updatedAt: new Date().toISOString() };
}

function profileUpsert(env, profile) {
  return env.DB.prepare(
    `INSERT INTO player_profiles (player_id, username, avatar, level, total_points, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET
       username = excluded.username,
       avatar = excluded.avatar,
       level = excluded.level,
       total_points = excluded.total_points,
       updated_at = excluded.updated_at`
  ).bind(profile.playerId, profile.username, profile.avatar, profile.level, profile.totalPoints, profile.updatedAt);
}

async function savePlayerProfile(request, env) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 2048) return json({ error: 'Request too large' }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const profile = parsePlayerProfile(body);
  if (!profile) return json({ error: 'Invalid profile' }, 400);
  await ensurePlayerProfiles(env);
  await profileUpsert(env, profile).run();
  return json({ ok: true }, 201);
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
  const profile = parsePlayerProfile(body);

  if (
    playerId.length < 8 || username.length < 1 || /[<>]/.test(username) ||
    !GAME_IDS.has(gameId) || !Number.isSafeInteger(score) || score < 0 ||
    score > 1000000000 || !Number.isInteger(rulesVersion) ||
    rulesVersion < 1 || rulesVersion > 100 || !profile
  ) {
    return json({ error: 'Invalid score' }, 400);
  }

  const id = crypto.randomUUID();
  const playedAt = new Date().toISOString();
  await ensurePlayerProfiles(env);
  const scoreStatement = env.DB.prepare(
    `INSERT INTO scores
      (id, player_id, username, avatar, game_id, score, won, played_at, duration_ms, rules_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, playerId, username, avatar, gameId, score, won, playedAt, durationMs, rulesVersion);
  await env.DB.batch([scoreStatement, profileUpsert(env, profile)]);

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
      if (request.method === 'POST' && url.pathname === '/api/profile') {
        return await savePlayerProfile(request, env);
      }
      if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ error: 'Server error' }, 500);
    }
  }
};
