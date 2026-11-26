import { stat } from 'node:fs/promises';
import path from 'node:path';
import catalog from '@/data/mori-course.json';

const firstVideoFile = catalog.levels[0]?.lessons[0]?.videos[0]?.file;

export async function isMoriCourseAvailable(
  root = process.env.MORI_COURSE_DIR || path.resolve(process.cwd(), 'public/media/mori-course'),
  videoFile = firstVideoFile,
): Promise<boolean> {
  if (!videoFile) return false;

  try {
    return (await stat(path.resolve(root, videoFile))).isFile();
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return false;
    }
    throw error;
  }
}
