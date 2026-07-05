import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  siteName: text('site_name'),
  content: text('content').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
})

export const games = sqliteTable('games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id').notNull().references(() => articles.id),
  profile: text('profile', { mode: 'json' }).notNull(),
  spec: text('spec', { mode: 'json' }).notNull(),
  difficulty: text('difficulty').notNull().default('beginner'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: integer('game_id').notNull().references(() => games.id),
  takeaways: text('takeaways', { mode: 'json' }).notNull(),
  answers: text('answers', { mode: 'json' }).notNull(),
  gaps: text('gaps', { mode: 'json' }).notNull().$defaultFn(() => []),
  mistakes: text('mistakes', { mode: 'json' }).notNull().$defaultFn(() => []),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const cards = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id').notNull().references(() => notes.id),
  question: text('question').notNull(),
  choices: text('choices', { mode: 'json' }).notNull(),
  correctChoiceId: text('correct_choice_id').notNull(),
  explanation: text('explanation').notNull(),
  dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
  streak: integer('streak').notNull().default(0),
})

export const hints = sqliteTable('hints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: integer('game_id').notNull().references(() => games.id),
  nodeId: text('node_id').notNull(),
  kind: text('kind').notNull(),
  query: text('query').notNull(),
  explanation: text('explanation').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
