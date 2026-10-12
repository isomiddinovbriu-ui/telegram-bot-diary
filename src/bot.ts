import { Markup, Telegraf, type Context } from 'telegraf';
import { DiaryDb } from './db.js';
import { emojiChoices, inferEmojiFromEdit, nextQuestionIndex, renderSegments, splitSegments, validSingleEmoji } from './emoji.js';
import type { EntryDoc, UserDoc } from './types.js';

const MAX_TEXT_LENGTH = 2000;

interface BotConfig {
  ownerUserId: string;
  groupChatId?: string;
}

function userId(ctx: Context): string | null {
  return ctx.from ? String(ctx.from.id) : null;
}

function questionKeyboard(entry: EntryDoc, frequent: Array<{ emoji: string; count: number }>) {
  const id = entry._id!.toHexString();
  const index = entry.questionIndex!;
  const rows = [];
  for (let i = 0; i < emojiChoices.length; i += 2) {
    rows.push(emojiChoices.slice(i, i + 2).map((choice) => Markup.button.callback(choice.label, `q:${id}:${index}:${choice.code}`)));
  }
  for (let i = 0; i < frequent.length; i += 2) {
    rows.push(frequent.slice(i, i + 2).map((item, offset) =>
      Markup.button.callback(`${item.emoji} (${item.count})`, `q:${id}:${index}:p${i + offset}`)
    ));
  }
  rows.push([Markup.button.callback('Boshqa emoji kiritaman', `q:${id}:${index}:custom`)]);
  return Markup.inlineKeyboard(rows);
}

function reviewKeyboard(entry: EntryDoc) {
  const id = entry._id!.toHexString();
  const version = entry.reviewVersion ?? 0;
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Tasdiqlash va guruhga yuborish', `f:${id}:${version}`)],
    [Markup.button.callback('✏️ Tahrirlash', `e:${id}:${version}`)]
  ]);
}

async function sendQuestion(db: DiaryDb, ctx: Context, entry: EntryDoc): Promise<void> {
  const segment = entry.segments[entry.questionIndex!];
  const frequent = await db.getFrequentEmojis(entry.userId);
  await ctx.reply(`Bu parcha uchun qaysi emoji mos?\n\n“${segment?.body.trim()}”`, questionKeyboard(entry, frequent));
}

async function sendReview(ctx: Context, entry: EntryDoc): Promise<void> {
  await ctx.reply(`Tayyor variant:\n\n${entry.proposedText}\n\nTasdiqlasangiz, bot shu matnni guruhga yuboradi. Xohlasangiz avval tahrirlang.`, reviewKeyboard(entry));
}

async function answerQuestion(db: DiaryDb, ctx: Context, entry: EntryDoc, emoji: string, custom = false): Promise<void> {
  const index = entry.questionIndex;
  if (index === null) return;
  const segment = entry.segments[index];
  if (!segment) return;
  if (custom) await db.saveEnteredEmoji(entry, index, emoji);
  segment.emoji = emoji;
  segment.source = emoji ? 'answer' : 'skip';
  if (emoji) {
    const user = await db.getUser(entry.userId);
    await db.saveLearnedPhrase(user, segment.body.trim(), emoji);
  }
  entry.questionIndex = nextQuestionIndex(entry.segments);
  if (entry.questionIndex === null) {
    entry.status = 'review';
    entry.proposedText = renderSegments(entry.segments);
    entry.proposedSource = 'bot';
  } else {
    entry.status = 'question';
  }
  await db.updateEntry(entry);
  if (entry.status === 'question') await sendQuestion(db, ctx, entry);
  else await sendReview(ctx, entry);
}

async function createEntry(db: DiaryDb, ctx: Context, user: UserDoc, originalText: string): Promise<void> {
  const now = new Date();
  const segments = splitSegments(originalText, user.learnedPhrases);
  const exact = user.exactOverrides.find((item) => item.originalText === originalText);
  const questionIndex = exact ? null : nextQuestionIndex(segments);
  const entry: EntryDoc = {
    userId: user._id,
    originalText,
    segments,
    status: questionIndex === null ? 'review' : 'question',
    questionIndex,
    proposedText: exact?.finalText ?? (questionIndex === null ? renderSegments(segments) : null),
    proposedSource: exact ? 'user' : 'bot',
    reviewVersion: 0,
    finalText: null,
    finalSource: null,
    groupChatId: null,
    groupMessageId: null,
    createdAt: now,
    updatedAt: now,
    finalizedAt: null
  };
  const result = await db.entries.insertOne(entry);
  entry._id = result.insertedId;
  await db.setActive(user._id, result.insertedId);
  if (questionIndex === null) await sendReview(ctx, entry);
  else await sendQuestion(db, ctx, entry);
}

export function createBot(token: string, db: DiaryDb, config: BotConfig): Telegraf<Context> {
  const bot = new Telegraf(token);

  bot.command('chatid', async (ctx) => {
    if (String(ctx.from.id) !== config.ownerUserId) return;
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') return;
    await ctx.reply(`Guruh ID: ${ctx.chat.id}\nBuni .env faylidagi GROUP_CHAT_ID ga yozing va botni qayta ishga tushiring.`);
  });

  bot.start(async (ctx) => {
    if (ctx.chat.type !== 'private' || String(ctx.from.id) !== config.ownerUserId) return;
    await db.getUser(String(ctx.from.id));
    await ctx.reply('Salom! Kundalik matningizni yuboring. Men faqat emoji qo‘shaman. Noaniq joyda sizdan so‘rayman; yakunda tahrirlab, tasdiqlaganingizdan keyin guruhga yuboraman. /tarix — eski yozuvlar, /bekor — joriy yozuvni bekor qilish.');
  });

  bot.command('tarix', async (ctx) => {
    if (ctx.chat.type !== 'private' || String(ctx.from.id) !== config.ownerUserId) return;
    const id = String(ctx.from.id);
    const entries = await db.entries.find({ userId: id, status: 'final' }).sort({ createdAt: -1 }).limit(5).toArray();
    if (!entries.length) return ctx.reply('Hozircha saqlangan yakuniy yozuv yo‘q.');
    const text = entries.map((entry, index) => `${index + 1}. ${entry.createdAt.toLocaleDateString('uz-UZ')} — ${entry.finalText?.slice(0, 180) ?? ''}`).join('\n\n');
    await ctx.reply(`Oxirgi yozuvlar:\n\n${text}`);
  });

  bot.command('bekor', async (ctx) => {
    if (ctx.chat.type !== 'private' || String(ctx.from.id) !== config.ownerUserId) return;
    const id = String(ctx.from.id);
    const entry = await db.getActiveEntry(id);
    if (!entry) return ctx.reply('Hozir faol yozuv yo‘q.');
    entry.status = 'cancelled';
    await db.updateEntry(entry);
    await db.setActive(id, null);
    await ctx.reply('Joriy yozuv bekor qilindi. Asl matn arxivda saqlangan. Yangi matn yuborishingiz mumkin.');
  });

  bot.on('text', async (ctx) => {
    if (ctx.chat.type !== 'private' || String(ctx.from.id) !== config.ownerUserId || ctx.message.text.startsWith('/')) return;
    const id = String(ctx.from.id);
    const text = ctx.message.text;
    const active = await db.getActiveEntry(id);
    if (active?.status === 'custom_emoji' || active?.status === 'question') {
      const emoji = text.trim();
      if (!validSingleEmoji(emoji)) {
        await ctx.reply('Bitta emoji yuboring yoki yuqoridagi tugmalardan tanlang. /bekor bilan chiqishingiz mumkin.');
        return;
      }
      await answerQuestion(db, ctx, active, emoji, active.status === 'custom_emoji');
      return;
    }
    if (active?.status === 'edit') {
      if (!text.trim() || text.length > MAX_TEXT_LENGTH + 500) {
        await ctx.reply('Tahrirlangan matn 2500 belgidan oshmasin.');
        return;
      }
      active.proposedText = text;
      active.proposedSource = 'user';
      active.reviewVersion = (active.reviewVersion ?? 0) + 1;
      active.status = 'review';
      await db.updateEntry(active);
      await sendReview(ctx, active);
      return;
    }
    if (active?.status === 'review') {
      await ctx.reply('Avval yuqoridagi Tasdiqlash yoki Tahrirlash tugmasini bosing. Yozuvdan chiqish uchun /bekor.');
      return;
    }
    if (!text.trim() || text.length > MAX_TEXT_LENGTH) {
      await ctx.reply('Matn 2000 belgidan oshmasin.');
      return;
    }
    const user = await db.getUser(id);
    await createEntry(db, ctx, user, text);
  });

  bot.on('callback_query', async (ctx) => {
    if (ctx.chat?.type !== 'private' || !('data' in ctx.callbackQuery)) return;
    const id = userId(ctx);
    if (!id) return;
    if (id !== config.ownerUserId) {
      await ctx.answerCbQuery('Bu bot siz uchun ochilmagan.');
      return;
    }
    const data = ctx.callbackQuery.data;
    const match = /^(q|e|f):([a-f0-9]{24})(?::(\d+)(?::([a-z0-9]+))?)?$/u.exec(data);
    if (!match) return;
    const entry = await db.getEntry(match[2]!, id);
    const user = await db.getUser(id);
    if (!entry || !user.activeEntryId?.equals(entry._id)) {
      await ctx.answerCbQuery('Bu tugma endi faol emas.');
      return;
    }
    const action = match[1];
    if (action === 'q') {
      const index = Number(match[3]);
      if (entry.status !== 'question' || entry.questionIndex !== index) {
        await ctx.answerCbQuery('Bu savol allaqachon javoblangan.');
        return;
      }
      const code = match[4];
      if (code === 'custom') {
        entry.status = 'custom_emoji';
        await db.updateEntry(entry);
        await ctx.answerCbQuery();
        await ctx.reply('Shu parcha uchun bitta emoji yuboring.');
        return;
      }
      if (/^p[0-3]$/u.test(code ?? '')) {
        const frequent = await db.getFrequentEmojis(id);
        const selected = frequent[Number(code!.slice(1))];
        if (!selected) {
          await ctx.answerCbQuery('Bu tanlov yangilangan.');
          await sendQuestion(db, ctx, entry);
          return;
        }
        await ctx.answerCbQuery();
        await answerQuestion(db, ctx, entry, selected.emoji);
        return;
      }
      const choice = emojiChoices.find((item) => item.code === code);
      if (!choice) return;
      await ctx.answerCbQuery();
      await answerQuestion(db, ctx, entry, choice.emoji);
      return;
    }
    if (entry.status !== 'review') {
      await ctx.answerCbQuery('Bu tugma endi faol emas.');
      return;
    }
    if (Number(match[3] ?? 0) !== (entry.reviewVersion ?? 0)) {
      await ctx.answerCbQuery('Eski tugma. Oxirgi ko‘rsatilgan matndan tanlang.');
      return;
    }
    if (action === 'e') {
      entry.status = 'edit';
      await db.updateEntry(entry);
      await ctx.answerCbQuery();
      await ctx.reply('Yakuniy matnni to‘liq tahrirlab, bitta xabar qilib yuboring. Siz yuborgan matn ustuvor bo‘ladi.');
      return;
    }
    if (action === 'f' && entry.proposedText !== null) {
      if (!config.groupChatId) {
        await ctx.answerCbQuery('GROUP_CHAT_ID sozlanmagan.');
        await ctx.reply('Botni guruhga qo‘shing, guruhda /chatid yuboring va chiqqan IDni .env dagi GROUP_CHAT_ID ga yozib botni qayta ishga tushiring.');
        return;
      }
      const claim = await db.entries.updateOne(
        { _id: entry._id, userId: id, status: 'review' },
        { $set: { status: 'sending', updatedAt: new Date() } }
      );
      if (claim.modifiedCount !== 1) {
        await ctx.answerCbQuery('Bu yozuv allaqachon yuborilmoqda.');
        return;
      }
      await ctx.answerCbQuery('Guruhga yuborilmoqda...');
      let sentMessageId: number;
      try {
        const sent = await ctx.telegram.sendMessage(config.groupChatId, entry.proposedText);
        sentMessageId = sent.message_id;
      } catch (error) {
        console.error('Group send failed:', error instanceof Error ? error.message : error);
        await db.entries.updateOne(
          { _id: entry._id, userId: id, status: 'sending' },
          { $set: { status: 'review', updatedAt: new Date() } }
        );
        await ctx.reply('Guruhga yuborishda xato bo‘ldi. Avval guruhni tekshiring; xabar ko‘rinmasa, GROUP_CHAT_ID va botning yozish huquqini tekshirib, yana tasdiqlang.');
        return;
      }
      entry.status = 'final';
      entry.finalText = entry.proposedText;
      entry.finalSource = entry.proposedSource ?? 'bot';
      entry.finalizedAt = new Date();
      entry.groupChatId = config.groupChatId;
      entry.groupMessageId = sentMessageId;
      try {
        await db.updateEntry(entry);
        await db.setActive(id, null);
        if (entry.finalSource === 'user') {
          await db.saveExactOverride(user, entry.originalText, entry.finalText);
          const editedEmoji = inferEmojiFromEdit(entry.originalText, entry.finalText);
          if (editedEmoji) await db.saveLearnedPhrase(user, entry.originalText.trim(), editedEmoji);
        }
      } catch (error) {
        console.error('Group message sent but database update failed:', error instanceof Error ? error.message : error);
        await ctx.reply('Xabar guruhga yuborildi, ammo bazaga saqlashda xato bo‘ldi. Qayta tasdiqlamang; server logini tekshiring.');
        return;
      }
      await ctx.reply('Tasdiqlandi va guruhga yuborildi.');
    }
  });

  bot.catch((error) => {
    console.error('Bot update failed:', error instanceof Error ? error.message : error);
  });
  return bot;
}
