import { describe, expect, it } from 'vitest';
import { isInlineMediaRequest, signPlayback, verifyPlayback } from './moriPlayback';

describe('mori playback token', () => {
  const file = '309.1 N5/bài.mp4';

  it('accepts a token for the same file', () => {
    expect(verifyPlayback(signPlayback(file), file)).toBe(true);
  });

  it('rejects a token used for a different file', () => {
    expect(verifyPlayback(signPlayback(file), 'other.mp4')).toBe(false);
  });

  it('rejects an expired token', () => {
    const token = signPlayback(file, Date.now() - 7 * 60 * 60 * 1000);
    expect(verifyPlayback(token, file)).toBe(false);
  });

  it('allows inline video, image, and pdf frames', () => {
    const video = new Headers({ 'sec-fetch-dest': 'video', 'sec-fetch-mode': 'no-cors' });
    const image = new Headers({ 'sec-fetch-dest': 'image', 'sec-fetch-mode': 'no-cors' });
    const pdf = new Headers({ 'sec-fetch-dest': 'iframe', 'sec-fetch-mode': 'navigate' });
    const tab = new Headers({ 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' });
    const hls = new Headers({ 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors' });
    const curl = new Headers();
    expect(isInlineMediaRequest(video)).toBe(true);
    expect(isInlineMediaRequest(image)).toBe(true);
    expect(isInlineMediaRequest(pdf)).toBe(true);
    expect(isInlineMediaRequest(hls)).toBe(true);
    expect(isInlineMediaRequest(tab)).toBe(false);
    expect(isInlineMediaRequest(curl)).toBe(false);
  });
});
