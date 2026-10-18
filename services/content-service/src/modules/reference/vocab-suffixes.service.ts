import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import type {
  CreateVocabSuffixGroupDto,
  CreateVocabSuffixItemDto,
  UpdateVocabSuffixGroupDto,
  UpdateVocabSuffixItemDto,
} from "@app/contracts";

const groupInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.VocabSuffixGroupInclude;

@Injectable()
export class VocabSuffixesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.vocabSuffixGroup
      .findMany({
        include: groupInclude,
        orderBy: { sortOrder: "asc" },
      })
      .then((groups) => this.toPayload(groups));
  }

  private async resolveGroup(slug: string) {
    const group = await this.prisma.vocabSuffixGroup.findUnique({
      where: { slug },
    });
    if (!group) {
      throw new BadRequestException(`Không tìm thấy nhóm hậu tố "${slug}"`);
    }
    return group;
  }

  async createGroup(dto: CreateVocabSuffixGroupDto) {
    const existing = await this.prisma.vocabSuffixGroup.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Slug "${dto.slug}" đã tồn tại`);
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder == null) {
      const agg = await this.prisma.vocabSuffixGroup.aggregate({
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    const group = await this.prisma.vocabSuffixGroup.create({
      data: {
        slug: dto.slug.trim(),
        label: dto.label.trim(),
        labelJa: dto.labelJa?.trim() ?? "",
        hint: dto.hint.trim(),
        sortOrder,
      },
      include: groupInclude,
    });

    return this.toGroup(group);
  }

  async updateGroup(slug: string, dto: UpdateVocabSuffixGroupDto) {
    const existing = await this.prisma.vocabSuffixGroup.findUnique({
      where: { slug },
    });
    if (!existing) {
      throw new NotFoundException(`Nhóm hậu tố "${slug}" không tồn tại`);
    }

    if (dto.slug && dto.slug !== slug) {
      const taken = await this.prisma.vocabSuffixGroup.findUnique({
        where: { slug: dto.slug },
      });
      if (taken) {
        throw new BadRequestException(`Slug "${dto.slug}" đã được dùng`);
      }
    }

    const group = await this.prisma.vocabSuffixGroup.update({
      where: { slug },
      data: {
        ...(dto.slug != null ? { slug: dto.slug.trim() } : {}),
        ...(dto.label != null ? { label: dto.label.trim() } : {}),
        ...(dto.labelJa !== undefined
          ? { labelJa: dto.labelJa?.trim() ?? "" }
          : {}),
        ...(dto.hint != null ? { hint: dto.hint.trim() } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
      },
      include: groupInclude,
    });

    return this.toGroup(group);
  }

  async removeGroup(slug: string) {
    const existing = await this.prisma.vocabSuffixGroup.findUnique({
      where: { slug },
    });
    if (!existing) {
      throw new NotFoundException(`Nhóm hậu tố "${slug}" không tồn tại`);
    }
    await this.prisma.vocabSuffixGroup.delete({ where: { slug } });
    return { ok: true, slug };
  }

  async createItem(dto: CreateVocabSuffixItemDto) {
    const group = await this.resolveGroup(dto.groupSlug);
    const forms = dto.forms?.map((f) => f.trim()).filter(Boolean) ?? [
      dto.suffix.trim(),
    ];
    const pos = dto.pos?.length ? dto.pos : ["noun"];

    let sortOrder = dto.sortOrder;
    if (sortOrder == null) {
      const agg = await this.prisma.vocabSuffixItem.aggregate({
        where: { groupId: group.id },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    const item = await this.prisma.vocabSuffixItem.create({
      data: {
        groupId: group.id,
        suffix: dto.suffix.trim(),
        forms,
        kana: dto.kana.trim(),
        romaji: dto.romaji.trim(),
        meaningVi: dto.meaningVi.trim(),
        attachesTo: dto.attachesTo.trim(),
        pos,
        exampleJa: dto.exampleJa.trim(),
        exampleVi: dto.exampleVi.trim(),
        sortOrder,
      },
    });

    return this.toItem(item, group.slug);
  }

  async updateItem(id: number, dto: UpdateVocabSuffixItemDto) {
    const existing = await this.prisma.vocabSuffixItem.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!existing) {
      throw new NotFoundException(`Hậu tố id ${id} không tồn tại`);
    }

    let groupId = existing.groupId;
    let groupSlug = existing.group.slug;
    if (dto.groupSlug && dto.groupSlug !== existing.group.slug) {
      const group = await this.resolveGroup(dto.groupSlug);
      groupId = group.id;
      groupSlug = group.slug;
    }

    const item = await this.prisma.vocabSuffixItem.update({
      where: { id },
      data: {
        ...(dto.groupSlug != null ? { groupId } : {}),
        ...(dto.suffix != null ? { suffix: dto.suffix.trim() } : {}),
        ...(dto.forms !== undefined
          ? {
              forms: dto.forms?.map((f) => f.trim()).filter(Boolean) ?? [],
            }
          : {}),
        ...(dto.kana != null ? { kana: dto.kana.trim() } : {}),
        ...(dto.romaji != null ? { romaji: dto.romaji.trim() } : {}),
        ...(dto.meaningVi != null ? { meaningVi: dto.meaningVi.trim() } : {}),
        ...(dto.attachesTo != null
          ? { attachesTo: dto.attachesTo.trim() }
          : {}),
        ...(dto.pos !== undefined
          ? { pos: dto.pos?.length ? dto.pos : ["noun"] }
          : {}),
        ...(dto.exampleJa != null ? { exampleJa: dto.exampleJa.trim() } : {}),
        ...(dto.exampleVi != null ? { exampleVi: dto.exampleVi.trim() } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return this.toItem(item, groupSlug);
  }

  async removeItem(id: number) {
    const existing = await this.prisma.vocabSuffixItem.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Hậu tố id ${id} không tồn tại`);
    }
    await this.prisma.vocabSuffixItem.delete({ where: { id } });
    return { ok: true, id };
  }

  async reorderItems(groupSlug: string, orderedIds: number[]) {
    const group = await this.resolveGroup(groupSlug);
    const existing = await this.prisma.vocabSuffixItem.findMany({
      where: { groupId: group.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        "orderedIds phải bao gồm mọi hậu tố trong nhóm này",
      );
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.vocabSuffixItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    const updated = await this.prisma.vocabSuffixGroup.findUnique({
      where: { slug: groupSlug },
      include: groupInclude,
    });
    if (!updated) {
      throw new NotFoundException(`Nhóm hậu tố "${groupSlug}" không tồn tại`);
    }
    return this.toGroup(updated);
  }

  toPayload(
    groups: Prisma.VocabSuffixGroupGetPayload<{
      include: typeof groupInclude;
    }>[],
  ) {
    return { groups: groups.map((g) => this.toGroup(g)) };
  }

  private toGroup(
    group: Prisma.VocabSuffixGroupGetPayload<{ include: typeof groupInclude }>,
  ) {
    return {
      id: group.slug,
      label: group.label,
      labelJa: group.labelJa || undefined,
      hint: group.hint,
      items: group.items.map((item) => this.toItem(item, group.slug)),
    };
  }

  private toItem(
    item: {
      id: number;
      suffix: string;
      forms: string[];
      kana: string;
      romaji: string;
      meaningVi: string;
      attachesTo: string;
      pos: string[];
      exampleJa: string;
      exampleVi: string;
    },
    groupSlug: string,
  ) {
    return {
      id: item.id,
      groupSlug,
      suffix: item.suffix,
      forms: item.forms?.length ? item.forms : [item.suffix],
      kana: item.kana,
      romaji: item.romaji,
      meaning: item.meaningVi,
      attachesTo: item.attachesTo,
      pos: item.pos?.length ? item.pos : ["noun"],
      exampleJa: item.exampleJa,
      exampleVi: item.exampleVi,
    };
  }
}
