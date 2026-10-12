import type { ObjectId } from 'mongodb';

export type EntryStatus = 'question' | 'custom_emoji' | 'review' | 'edit' | 'sending' | 'final' | 'cancelled';

export interface LearnedPhrase {
  phrase: string;
  emoji: string;
  updatedAt: Date;
}

export interface ExactOverride {
  originalText: string;
  finalText: string;
  updatedAt: Date;
}

export interface UserDoc {
  _id: string; // Telegram user ID, string to avoid numeric conversion issues.
  activeEntryId: ObjectId | null;
  learnedPhrases: LearnedPhrase[];
  exactOverrides: ExactOverride[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Segment {
  body: string;
  separator: string;
  emoji: string | null;
  source: 'rule' | 'learned' | 'answer' | 'skip' | null;
}

export interface EnteredEmojiDoc {
  _id?: ObjectId;
  userId: string;
  entryId: ObjectId;
  segmentIndex: number;
  segmentText: string;
  emoji: string;
  createdAt: Date;
}

export interface EntryDoc {
  _id?: ObjectId;
  userId: string;
  originalText: string;
  segments: Segment[];
  status: EntryStatus;
  questionIndex: number | null;
  proposedText: string | null;
  proposedSource?: 'bot' | 'user';
  reviewVersion?: number;
  finalText: string | null;
  finalSource: 'bot' | 'user' | null;
  groupChatId?: string | null;
  groupMessageId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
}
