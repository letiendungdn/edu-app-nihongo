import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveCourseFile } from './[...path]/route';

const root = path.resolve('/tmp/mori-course');

describe('resolveCourseFile', () => {
  it('keeps a nested video inside the course folder', () => {
    const abs = resolveCourseFile(root, ['309.1 N5', 'bài.mp4']);
    expect(abs).toBe(path.join(root, '309.1 N5', 'bài.mp4'));
  });

  it('rejects a path that climbs out of the course folder', () => {
    expect(resolveCourseFile(root, ['..', 'etc', 'passwd'])).toBeNull();
  });
});
