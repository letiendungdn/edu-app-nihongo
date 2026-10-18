import { Injectable, NotFoundException } from "@nestjs/common";
import type { FeatureFlag, Role } from "@prisma/client";
import { PrismaService } from "@app/prisma";

/** Mỗi pod giữ bản sao ngắn hạn — đổi cờ có hiệu lực tối đa sau CACHE_MS, không truy vấn DB mỗi request. */
const CACHE_MS = 30_000;

/** Cờ bật cho người xem này? roles rỗng = mọi người (kể cả khách); có giá trị = chỉ các vai trò đó. */
export function isFlagOn(
  flag: Pick<FeatureFlag, "enabled" | "roles"> | undefined,
  role?: Role | null,
): boolean {
  if (!flag?.enabled) return false;
  if (flag.roles.length === 0) return true;
  return role != null && flag.roles.includes(role);
}

@Injectable()
export class FeatureFlagsService {
  private cache: { at: number; flags: FeatureFlag[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async all(): Promise<FeatureFlag[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS)
      return this.cache.flags;
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { key: "asc" },
    });
    this.cache = { at: Date.now(), flags };
    return flags;
  }

  async isOn(key: string, role?: Role | null): Promise<boolean> {
    const flags = await this.all();
    return isFlagOn(
      flags.find((f) => f.key === key),
      role,
    );
  }

  /** Các cờ đang bật cho người xem — web chỉ cần biết key, không cần cấu hình vai trò. */
  async enabledKeys(role?: Role | null): Promise<string[]> {
    return (await this.all())
      .filter((f) => isFlagOn(f, role))
      .map((f) => f.key);
  }

  listAll(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  async update(
    key: string,
    data: { enabled?: boolean; roles?: Role[]; description?: string },
  ) {
    const exists = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!exists) throw new NotFoundException(`Không có feature flag "${key}"`);
    const flag = await this.prisma.featureFlag.update({ where: { key }, data });
    this.cache = null; // pod này thấy thay đổi ngay; pod khác sau tối đa CACHE_MS
    return flag;
  }

  async create(data: {
    key: string;
    enabled?: boolean;
    roles?: Role[];
    description?: string;
  }) {
    const flag = await this.prisma.featureFlag.create({
      data: {
        key: data.key,
        enabled: data.enabled ?? false,
        roles: data.roles ?? [],
        description: data.description,
      },
    });
    this.cache = null;
    return flag;
  }
}
