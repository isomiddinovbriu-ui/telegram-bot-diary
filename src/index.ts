import 'dotenv/config';
import { createBot } from './bot.js';
import { DiaryDb } from './db.js';

const token = process.env.BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || 'emoji_diary';
const ownerUserId = process.env.OWNER_TELEGRAM_ID;
const groupChatId = process.env.GROUP_CHAT_ID;

if (!token || !mongoUri || !ownerUserId) {
  console.error('BOT_TOKEN, MONGODB_URI va OWNER_TELEGRAM_ID .env faylida bo‘lishi kerak.');
  process.exit(1);
}
if (!/^\d+$/u.test(ownerUserId)) {
  console.error('OWNER_TELEGRAM_ID raqamlardan iborat bo‘lishi kerak.');
  process.exit(1);
}

const db = new DiaryDb(mongoUri, databaseName);
await db.connect();
const bot = createBot(token, db, { ownerUserId, groupChatId });

const shutdown = async (signal: string) => {
  bot.stop(signal);
  await db.close();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

await bot.launch();
console.log('Emoji kundalik boti ishga tushdi.');
