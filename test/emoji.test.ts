import assert from 'node:assert/strict';
import test from 'node:test';
import { inferEmojiFromEdit, learnPhrase, nextQuestionIndex, renderSegments, splitSegments, suggestEmoji, validSingleEmoji } from '../src/emoji.js';

test('known emotion adds an emoji without changing the original words', () => {
  const segments = splitSegments('Bugun xursand bo‘ldim. Ertalab qiynaldim.', []);
  assert.equal(nextQuestionIndex(segments), null);
  assert.equal(renderSegments(segments), 'Bugun xursand bo‘ldim 😊. Ertalab qiynaldim 😴.');
});

test('unknown, conflicting, and negated emotions need clarification', () => {
  assert.equal(suggestEmoji('Bugun ishga bordim', []), null);
  assert.equal(suggestEmoji('Xursand edim, lekin xavotirlandim', []), null);
  assert.equal(suggestEmoji('Xafa emasman', []), null);
});

test('a taught phrase overrides a general rule', () => {
  const learned = learnPhrase([], 'xursand bo‘ldim', '🥹');
  assert.deepEqual(suggestEmoji('Bugun xursand bo‘ldim', learned), { emoji: '🥹', source: 'learned' });
});

test('custom input accepts exactly one emoji', () => {
  assert.equal(validSingleEmoji('🥹'), true);
  assert.equal(validSingleEmoji('🥹😔'), false);
  assert.equal(validSingleEmoji('salom'), false);
});

test('an unambiguous user edit corrects the learned emoji', () => {
  assert.equal(inferEmojiFromEdit('salom', 'salom 😔'), '😔');
  assert.equal(inferEmojiFromEdit('salom', 'assalom 😔'), null);
  assert.equal(inferEmojiFromEdit('salom', 'salom 😔😊'), null);
});
