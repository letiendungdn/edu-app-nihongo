import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  CONTENT_SERVICE_TABLES,
  EXAM_SERVICE_TABLES,
  type TableOwner,
  tableOwner,
} from './table-ownership';

const ROOT = join(__dirname, '..', '..', '..');
const WRITE_OPS = 'create|createMany|update|updateMany|upsert|delete|deleteMany';

/** Thư mục code → tiến trình chạy nó. payment-service không chạy riêng: gateway import thẳng. */
const PROCESS_DIRS: Record<string, TableOwner> = {
  'services/api-gateway/src': 'api-gateway',
  'services/payment-service/src': 'api-gateway',
  'services/content-service/src': 'content-service',
  'services/exam-service/src': 'exam-service',
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [path] : [];
  });
}

const models = [
  ...readFileSync(join(ROOT, 'packages/prisma-nihongo/schema.prisma'), 'utf8').matchAll(
    /^model (\w+)/gm,
  ),
].map((m) => m[1]);

describe('Quyền ghi bảng giữa các service (ADR-0010)', () => {
  it('danh sách bảng trong table-ownership.ts đều có trong schema.prisma', () => {
    const unknown = [...CONTENT_SERVICE_TABLES, ...EXAM_SERVICE_TABLES].filter(
      (t) => !models.includes(t),
    );
    expect(unknown).toEqual([]);
  });

  it('không service nào ghi thẳng vào bảng của service khác', () => {
    const violations: string[] = [];
    for (const [dir, proc] of Object.entries(PROCESS_DIRS)) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const text = readFileSync(file, 'utf8');
        for (const model of models) {
          const owner = tableOwner(model);
          if (owner === 'shared' || owner === proc) continue;
          const accessor = model[0].toLowerCase() + model.slice(1);
          const re = new RegExp(`\\b(?:prisma|tx)\\.${accessor}\\.(${WRITE_OPS})\\(`, 'g');
          for (const m of text.matchAll(re)) {
            const line = text.slice(0, m.index).split('\n').length;
            violations.push(
              `${relative(ROOT, file)}:${line} — ${proc} ${m[1]} ${model} (chủ: ${owner}). Gọi ${owner} qua gRPC.`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
