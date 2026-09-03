import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const scores = sqliteTable(
  'scores',
  {
    id: text('id').primaryKey(),
    playerId: text('player_id').notNull(),
    username: text('username').notNull(),
    avatar: text('avatar').notNull().default('🎮'),
    gameId: text('game_id').notNull(),
    score: integer('score').notNull(),
    won: integer('won', { mode: 'boolean' }).notNull().default(false),
    playedAt: text('played_at').notNull(),
    durationMs: integer('duration_ms').notNull().default(0),
    rulesVersion: integer('rules_version').notNull().default(1),
  },
  (table) => [
    index('idx_scores_game_rules_score').on(
      table.gameId,
      table.rulesVersion,
      table.score,
    ),
    index('idx_scores_player_game').on(table.playerId, table.gameId),
  ],
);
