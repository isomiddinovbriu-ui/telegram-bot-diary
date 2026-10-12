import type { ObjectId } from 'mongodb';

export type EntryStatus = 'question' | 'custom_emoji' | 'review' | 'edit' | 'final' | 'cancelled';

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

export interface EntryDoc {
  _id?: ObjectId;
  userId: string;
  originalText: string;
  segments: Segment[];
  status: EntryStatus;
  questionIndex: number | null;
  proposedText: string | null;
  finalText: string | null;
  finalSource: 'bot' | 'user' | null;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
}
