import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { isMoriCourseAvailable } from './moriCourseAvailability';

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mori-course-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('isMoriCourseAvailable', () => {
  it('returns false when the course file is missing', async () => {
    const root = await createTempDir();
    expect(await isMoriCourseAvailable(root, 'lesson/video.mp4')).toBe(false);
  });

  it('returns true when the catalog video exists', async () => {
    const root = await createTempDir();
    await mkdir(path.join(root, 'lesson'));
    await writeFile(path.join(root, 'lesson/video.mp4'), '');
    expect(await isMoriCourseAvailable(root, 'lesson/video.mp4')).toBe(true);
  });
});
