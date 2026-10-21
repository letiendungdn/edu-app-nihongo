import { describe, expect, it } from 'vitest';
import { isHlsName, segmentIsClosed } from './moriHls';

describe('mori HLS playlist', () => {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:6,',
    'seg_00000.ts',
    '#EXTINF:6,',
    'seg_00001.ts',
    '#EXT-X-ENDLIST',
  ].join('\n');

  it('treats a segment as closed once the next one is listed', () => {
    expect(segmentIsClosed(playlist, 'seg_00000.ts')).toBe(true);
    expect(segmentIsClosed(playlist, 'seg_00001.ts')).toBe(true);
    expect(segmentIsClosed(playlist, 'seg_00002.ts')).toBe(false);
  });

  it('only allows the playlist and numbered segments', () => {
    expect(isHlsName('index.m3u8')).toBe(true);
    expect(isHlsName('seg_00003.ts')).toBe(true);
    expect(isHlsName('../index.m3u8')).toBe(false);
    expect(isHlsName('seg_1.ts')).toBe(false);
  });
});
