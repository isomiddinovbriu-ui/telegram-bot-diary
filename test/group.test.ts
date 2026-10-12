import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { Telegram } from 'telegraf';
import { createBot } from '../src/bot.js';
import type { DiaryDb } from '../src/db.js';
import type { EntryDoc, UserDoc } from '../src/types.js';

test('confirmation sends the reviewed text to the configured group and records its message ID', async () => {
  const userId = '6813396933';
  const entryId = new ObjectId();
  const now = new Date();
  const user: UserDoc = {
    _id: userId,
    activeEntryId: entryId,
    learnedPhrases: [],
    exactOverrides: [],
    createdAt: now,
    updatedAt: now
  };
  const entry: EntryDoc = {
    _id: entryId,
    userId,
    originalText: 'salom',
    segments: [{ body: 'salom', separator: '', emoji: '😍', source: 'answer' }],
    status: 'review',
    questionIndex: null,
    proposedText: 'salom 😍',
    proposedSource: 'bot',
    reviewVersion: 0,
    finalText: null,
    finalSource: null,
    createdAt: now,
    updatedAt: now,
    finalizedAt: null
  };
  const db = {
    getEntry: async () => entry,
    getUser: async () => user,
    entries: { updateOne: async () => ({ modifiedCount: 1 }) },
    updateEntry: async () => undefined,
    setActive: async (_id: string, activeEntryId: ObjectId | null) => { user.activeEntryId = activeEntryId; }
  } as unknown as DiaryDb;
  const bot = createBot('123:fake', db, { ownerUserId: userId, groupChatId: '-1001234567890' });
  bot.botInfo = { id: 123, is_bot: true, first_name: 'Test', username: 'test_bot', can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false };

  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  const originalCallApi = Telegram.prototype.callApi;
  Telegram.prototype.callApi = async function (method, payload) {
    calls.push({ method, payload: payload as Record<string, unknown> });
    if (method === 'sendMessage') return { message_id: 77 } as never;
    return true as never;
  };
  try {
    await bot.handleUpdate({
      update_id: 1,
      callback_query: {
        id: 'cb1',
        from: { id: Number(userId), is_bot: false, first_name: 'Owner' },
        chat_instance: 'test',
        data: `f:${entryId.toHexString()}:0`,
        message: {
          message_id: 10,
          date: Math.floor(Date.now() / 1000),
          chat: { id: Number(userId), type: 'private', first_name: 'Owner' },
          text: 'Tayyor variant'
        }
      }
    } as Parameters<typeof bot.handleUpdate>[0]);
  } finally {
    Telegram.prototype.callApi = originalCallApi;
  }

  const groupSend = calls.find((call) => call.method === 'sendMessage' && call.payload.chat_id === '-1001234567890');
  assert.equal(groupSend?.payload.text, 'salom 😍');
  assert.equal(entry.status, 'final');
  assert.equal(entry.groupMessageId, 77);
  assert.equal(user.activeEntryId, null);
});
