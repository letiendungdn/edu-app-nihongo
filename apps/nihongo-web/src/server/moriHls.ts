import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const SEGMENT_NAME = /^seg_\d{5}\.ts$/;

type Job = { proc: ChildProcess | null; done: boolean; error?: string };

const jobs = new Map<string, Job>();

export function hlsCacheRoot(): string {
  return process.env.MORI_HLS_CACHE || path.join(os.tmpdir(), 'mori-hls');
}

export function isHlsName(name: string): boolean {
  return name === 'index.m3u8' || SEGMENT_NAME.test(name);
}

/** Đoạn đã ghi xong khi playlist đã có đoạn sau nó, hoặc đã có ENDLIST. */
export function segmentIsClosed(playlist: string, name: string): boolean {
  const lines = playlist.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const idx = lines.indexOf(name);
  if (idx < 0) return false;
  return lines.slice(idx + 1).some((line) => line.startsWith('seg_') || line.startsWith('#EXT-X-ENDLIST'));
}

async function cacheDirFor(absFile: string): Promise<string> {
  const info = await stat(absFile);
  const key = createHash('sha256')
    .update(`${absFile}\0${info.size}\0${info.mtimeMs}`)
    .digest('hex')
    .slice(0, 24);
  return path.join(hlsCacheRoot(), key);
}

function startJob(absFile: string, dir: string) {
  if (jobs.get(dir)?.proc) return;
  const proc = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-i', absFile,
    '-c', 'copy',
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_list_size', '0',
    '-hls_playlist_type', 'event',
    '-hls_segment_filename', 'seg_%05d.ts',
    'index.m3u8',
  ], { cwd: dir });
  const job: Job = { proc, done: false };
  jobs.set(dir, job);
  let stderr = '';
  proc.stderr?.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-800);
  });
  proc.on('error', (err) => {
    job.done = true;
    job.proc = null;
    job.error = err.message;
  });
  proc.on('exit', (code) => {
    job.done = true;
    job.proc = null;
    if (code !== 0) job.error = stderr || `ffmpeg thoát với mã ${code}`;
  });
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Bắt đầu đóng gói (nếu chưa có) và đợi playlist có ít nhất một đoạn. */
export async function prepareHls(absFile: string): Promise<string> {
  const dir = await cacheDirFor(absFile);
  await mkdir(dir, { recursive: true });
  const playlistPath = path.join(dir, 'index.m3u8');

  const readPlaylist = async () => {
    try {
      return await readFile(playlistPath, 'utf8');
    } catch {
      return '';
    }
  };

  let text = await readPlaylist();
  if (text.includes('#EXT-X-ENDLIST')) return dir;

  const failed = jobs.get(dir);
  if (failed?.error) {
    jobs.delete(dir);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    text = '';
  }
  if (!text.includes('#EXTINF') && !jobs.get(dir)?.proc) startJob(absFile, dir);

  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    const job = jobs.get(dir);
    if (job?.error) throw new Error(job.error);
    text = await readPlaylist();
    if (text.includes('#EXTINF')) return dir;
    await sleep(200);
  }
  throw new Error('Không tạo được playlist HLS');
}

export async function readHlsFile(dir: string, name: string): Promise<Buffer | null> {
  if (!isHlsName(name)) return null;
  const file = path.resolve(dir, name);
  if (!file.startsWith(path.resolve(dir) + path.sep) && file !== path.resolve(dir, name)) return null;

  if (name === 'index.m3u8') {
    try {
      return await readFile(file);
    } catch {
      return null;
    }
  }

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    let playlist = '';
    try {
      playlist = await readFile(path.join(dir, 'index.m3u8'), 'utf8');
    } catch {
      playlist = '';
    }
    if (segmentIsClosed(playlist, name)) {
      try {
        return await readFile(file);
      } catch {
        return null;
      }
    }
    const job = jobs.get(dir);
    if (job?.done && !segmentIsClosed(playlist, name)) return null;
    await sleep(200);
  }
  return null;
}
