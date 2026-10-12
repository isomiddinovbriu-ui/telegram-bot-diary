import { MongoClient, ObjectId, type Collection } from 'mongodb';
import type { EnteredEmojiDoc, EntryDoc, ExactOverride, LearnedPhrase, UserDoc } from './types.js';
import { learnPhrase } from './emoji.js';

export class DiaryDb {
  private client: MongoClient;
  readonly users: Collection<UserDoc>;
  readonly entries: Collection<EntryDoc>;
  readonly enteredEmojis: Collection<EnteredEmojiDoc>;

  constructor(uri: string, databaseName: string) {
    this.client = new MongoClient(uri);
    const database = this.client.db(databaseName);
    this.users = database.collection<UserDoc>('users');
    this.entries = database.collection<EntryDoc>('entries');
    this.enteredEmojis = database.collection<EnteredEmojiDoc>('entiries_entered');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.entries.createIndex({ userId: 1, createdAt: -1 });
    await this.enteredEmojis.createIndex({ entryId: 1, segmentIndex: 1 }, { unique: true });
    await this.enteredEmojis.createIndex({ userId: 1, emoji: 1, createdAt: -1 });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async getUser(userId: string): Promise<UserDoc> {
    const now = new Date();
    await this.users.updateOne(
      { _id: userId },
      { $setOnInsert: { activeEntryId: null, learnedPhrases: [], exactOverrides: [], createdAt: now, updatedAt: now } },
      { upsert: true }
    );
    const user = await this.users.findOne({ _id: userId });
    if (!user) throw new Error('User could not be loaded');
    return user;
  }

  async setActive(userId: string, entryId: ObjectId | null): Promise<void> {
    await this.users.updateOne({ _id: userId }, { $set: { activeEntryId: entryId, updatedAt: new Date() } });
  }

  async getActiveEntry(userId: string): Promise<EntryDoc | null> {
    const user = await this.getUser(userId);
    if (!user.activeEntryId) return null;
    return this.entries.findOne({ _id: user.activeEntryId, userId });
  }

  async saveLearnedPhrase(user: UserDoc, phrase: string, emoji: string): Promise<void> {
    const learnedPhrases: LearnedPhrase[] = learnPhrase(user.learnedPhrases, phrase, emoji);
    await this.users.updateOne({ _id: user._id }, { $set: { learnedPhrases, updatedAt: new Date() } });
  }

  async saveEnteredEmoji(entry: EntryDoc, segmentIndex: number, emoji: string): Promise<void> {
    if (!entry._id) throw new Error('Missing entry ID');
    const segment = entry.segments[segmentIndex];
    if (!segment) throw new Error('Missing segment');
    await this.enteredEmojis.updateOne(
      { entryId: entry._id, segmentIndex },
      { $setOnInsert: {
        userId: entry.userId,
        entryId: entry._id,
        segmentIndex,
        segmentText: segment.body.trim(),
        emoji,
        createdAt: new Date()
      } },
      { upsert: true }
    );
  }

  async getFrequentEmojis(userId: string): Promise<Array<{ emoji: string; count: number }>> {
    const results = await this.enteredEmojis.aggregate<{ _id: string; count: number }>([
      { $match: { userId } },
      { $group: { _id: '$emoji', count: { $sum: 1 }, lastUsedAt: { $max: '$createdAt' } } },
      { $sort: { count: -1, lastUsedAt: -1, _id: 1 } },
      { $limit: 4 }
    ]).toArray();
    return results.map((result) => ({ emoji: result._id, count: result.count }));
  }

  async saveExactOverride(user: UserDoc, originalText: string, finalText: string): Promise<void> {
    const exactOverrides: ExactOverride[] = [
      { originalText, finalText, updatedAt: new Date() },
      ...user.exactOverrides.filter((item) => item.originalText !== originalText)
    ].slice(0, 100);
    await this.users.updateOne({ _id: user._id }, { $set: { exactOverrides, updatedAt: new Date() } });
  }

  async updateEntry(entry: EntryDoc): Promise<void> {
    if (!entry._id) throw new Error('Missing entry ID');
    entry.updatedAt = new Date();
    const { _id, ...data } = entry;
    await this.entries.updateOne({ _id, userId: entry.userId }, { $set: data });
  }

  async getEntry(id: string, userId: string): Promise<EntryDoc | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.entries.findOne({ _id: new ObjectId(id), userId });
  }
}
