import 'dotenv/config';
import { createBot } from './bot.js';
import { DiaryDb } from './db.js';

const token = process.env.BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || 'emoji_diary';

if (!token || !mongoUri) {
  console.error('BOT_TOKEN va MONGODB_URI .env faylida bo‘lishi kerak.');
  process.exit(1);
}

const db = new DiaryDb(mongoUri, databaseName);
await db.connect();
const bot = createBot(token, db);

const shutdown = async (signal: string) => {
  bot.stop(signal);
  await db.close();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

await bot.launch();
console.log('Emoji kundalik boti ishga tushdi.');
