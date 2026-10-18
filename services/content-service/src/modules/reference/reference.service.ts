import { Injectable, NotFoundException } from "@nestjs/common";
import { JlptSessionStatus, KanaScript } from "@prisma/client";
import { PrismaService } from "@app/prisma";
import { VocabSuffixesService } from "./vocab-suffixes.service";

const SLUGS = [
  "kana-charts",
  "japanese-counters",
  "japanese-country-names",
  "japanese-vocab-suffixes",
  "japanese-pronunciation-rules",
  "english-katakana",
  "daily-listening",
  "book-audio-files",
  "jlpt-roadmap",
  "jlpt-danang-schedule",
  "home-page",
  "japanese-conversation",
  "japanese-roleplay",
  "textbooks",
] as const;

type ReferenceSlug = (typeof SLUGS)[number];

function sessionStatusToApi(status: JlptSessionStatus): string {
  const map: Record<JlptSessionStatus, string> = {
    REGISTRATION_OPEN: "registration_open",
    REGISTRATION_CLOSED: "registration_closed",
    UPCOMING: "upcoming",
    PAST: "past",
  };
  return map[status];
}

@Injectable()
export class ReferenceService {
  constructor(
    private prisma: PrismaService,
    private vocabSuffixesService: VocabSuffixesService,
  ) {}

  findAll(): Array<{ slug: ReferenceSlug; title: string }> {
    return SLUGS.map((slug) => ({ slug, title: this.titleFor(slug) }));
  }

  async findBySlug(slug: string) {
    if (!SLUGS.includes(slug as ReferenceSlug)) {
      throw new NotFoundException(`Reference content not found: ${slug}`);
    }

    switch (slug as ReferenceSlug) {
      case "kana-charts":
        return this.getKanaCharts();
      case "japanese-counters":
        return this.getJapaneseCounters();
      case "japanese-country-names":
        return this.getJapaneseCountryNames();
      case "japanese-vocab-suffixes":
        return this.getJapaneseVocabSuffixes();
      case "japanese-pronunciation-rules":
        return this.getJapanesePronunciationRules();
      case "english-katakana":
        return this.getEnglishKatakana();
      case "daily-listening":
        return this.getDailyListening();
      case "book-audio-files":
        return this.getBookAudioFiles();
      case "jlpt-roadmap":
        return this.getJlptRoadmap();
      case "jlpt-danang-schedule":
        return this.getJlptDanangSchedule();
      case "home-page":
        return this.getHomePage();
      case "japanese-conversation":
        return this.getJapaneseConversation();
      case "japanese-roleplay":
        return this.getJapaneseRoleplay();
      case "textbooks":
        return this.getTextbooks();
      default:
        throw new NotFoundException(`Reference content not found: ${slug}`);
    }
  }

  private titleFor(slug: ReferenceSlug): string {
    const titles: Record<ReferenceSlug, string> = {
      "kana-charts": "Bảng kana Hiragana/Katakana",
      "japanese-counters": "Đếm số & thứ tự tiếng Nhật",
      "japanese-country-names": "Tên quốc gia tiếng Nhật",
      "japanese-vocab-suffixes": "Hậu tố từ vựng tiếng Nhật",
      "japanese-pronunciation-rules": "Quy tắc phát âm tiếng Nhật",
      "english-katakana": "Tiếng Anh ↔ Katakana",
      "daily-listening": "Nghe mỗi ngày — podcast & preset",
      "book-audio-files": "File nghe sách tiếng Nhật",
      "jlpt-roadmap": "Lộ trình JLPT",
      "jlpt-danang-schedule": "Lịch thi JLPT Đà Nẵng",
      "home-page": "Trang chủ — thống kê & mục học",
      "japanese-conversation": "会話 — 自己紹介 & câu giao tiếp",
      "japanese-roleplay": "会話 — Đóng vai hội thoại",
      textbooks:
        "Giáo trình tham khảo (Minna, Sou Matome, Shinkanzen, TRY!, KLL)",
    };
    return titles[slug];
  }

  /** Danh mục giáo trình: bộ sách + sách theo cấp/kỹ năng (menu Giáo trình, /textbooks, mind map). */
  private async getTextbooks() {
    const series = await this.prisma.textbookSeries.findMany({
      orderBy: { sortOrder: "asc" },
      include: { books: { orderBy: [{ level: "asc" }, { sortOrder: "asc" }] } },
    });
    return {
      series: series.map((s) => ({
        code: s.code,
        name: s.name,
        nameJa: s.nameJa,
        publisher: s.publisher,
        url: s.url,
        blurb: s.blurb,
        icon: s.icon,
        planLevels: s.planLevels,
        audioMatch: s.audioMatch,
        books: s.books.map((b) => ({
          level: b.level,
          title: b.title,
          note: b.note ?? undefined,
          url: b.url ?? undefined,
          kinds: b.kinds,
        })),
      })),
    };
  }

  private async getKanaCharts() {
    const sections = await this.prisma.kanaSection.findMany({
      include: {
        cells: { orderBy: [{ rowIndex: "asc" }, { colIndex: "asc" }] },
      },
      orderBy: [{ script: "asc" }, { sortOrder: "asc" }],
    });

    const mapScript = (script: KanaScript) =>
      sections
        .filter((s) => s.script === script)
        .map((section) => {
          const rowCount =
            section.cells.reduce((max, c) => Math.max(max, c.rowIndex), -1) + 1;
          const colCount = section.columns;
          const rows: Array<Array<{ kana: string; romaji: string }>> =
            Array.from({ length: rowCount }, () =>
              Array.from({ length: colCount }, () => ({
                kana: "",
                romaji: "",
              })),
            );

          for (const cell of section.cells) {
            rows[cell.rowIndex][cell.colIndex] = {
              kana: cell.kana,
              romaji: cell.romaji,
            };
          }

          return {
            id: section.slug,
            title: section.title,
            subtitle: section.subtitle ?? undefined,
            columns: section.columns,
            rows,
          };
        });

    return {
      hiraganaSections: mapScript(KanaScript.HIRAGANA),
      katakanaSections: mapScript(KanaScript.KATAKANA),
    };
  }

  private async getJapaneseCounters() {
    const categories = await this.prisma.counterCategory.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    return {
      categories: categories.map((cat) => ({
        id: cat.slug,
        label: cat.label,
        hint: cat.hint,
        items: cat.items.map((item) => ({
          n: /^-?\d+$/.test(item.displayNumber)
            ? Number(item.displayNumber)
            : item.displayNumber,
          kanji: item.kanji ?? undefined,
          kana: item.kana,
          romaji: item.romaji,
          vi: item.meaningVi,
        })),
      })),
    };
  }

  private async getJapaneseCountryNames() {
    const regions = await this.prisma.countryRegion.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    return {
      regions: regions.map((region) => ({
        id: region.slug,
        label: region.label,
        items: region.items.map((item) => ({
          nameJa: item.nameJa,
          kana: item.kana,
          romaji: item.romaji,
          meaning: item.meaningVi,
          code: item.countryCode,
        })),
      })),
    };
  }

  private getJapaneseVocabSuffixes() {
    return this.vocabSuffixesService.findAll();
  }

  private async getJapanesePronunciationRules() {
    const meta = await this.prisma.pronunciationRulesMeta.findUnique({
      where: { id: 1 },
    });
    if (!meta) {
      throw new NotFoundException("Japanese pronunciation rules not seeded");
    }

    const [tips, sections] = await Promise.all([
      this.prisma.pronunciationRuleTip.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.pronunciationRuleSection.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          points: { orderBy: { sortOrder: "asc" } },
          examples: { orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    return {
      intro: meta.intro,
      tipsForVietnamese: tips.map((tip) => tip.text),
      sections: sections.map((section) => ({
        id: section.slug,
        title: section.title,
        summary: section.summary,
        points: section.points.map((point) => ({
          ...(point.label ? { label: point.label } : {}),
          ...(point.japanese ? { japanese: point.japanese } : {}),
          ...(point.romaji ? { romaji: point.romaji } : {}),
          explanation: point.explanation,
        })),
        ...(section.examples.length > 0
          ? {
              examples: section.examples.map((example) => ({
                japanese: example.japanese,
                romaji: example.romaji,
                meaning: example.meaning,
                ...(example.note ? { note: example.note } : {}),
              })),
            }
          : {}),
      })),
    };
  }

  private async getEnglishKatakana() {
    const meta = await this.prisma.englishKatakanaMeta.findUnique({
      where: { id: 1 },
    });
    if (!meta) {
      throw new NotFoundException("English–Katakana reference not seeded");
    }

    const [tips, sections] = await Promise.all([
      this.prisma.englishKatakanaTip.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.englishKatakanaSection.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          points: { orderBy: { sortOrder: "asc" } },
          mappings: { orderBy: { sortOrder: "asc" } },
          examples: { orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    return {
      intro: meta.intro,
      tipsForVietnamese: tips.map((tip) => tip.text),
      sections: sections.map((section) => ({
        id: section.slug,
        title: section.title,
        summary: section.summary,
        ...(section.points.length > 0
          ? {
              points: section.points.map((point) => ({
                explanation: point.explanation,
                ...(point.english ? { english: point.english } : {}),
                ...(point.katakana ? { katakana: point.katakana } : {}),
                ...(point.romaji ? { romaji: point.romaji } : {}),
              })),
            }
          : {}),
        ...(section.mappings.length > 0
          ? {
              mappings: section.mappings.map((mapping) => ({
                english: mapping.english,
                katakana: mapping.katakana,
                romaji: mapping.romaji,
                ...(mapping.note ? { note: mapping.note } : {}),
              })),
            }
          : {}),
        ...(section.examples.length > 0
          ? {
              examples: section.examples.map((example) => ({
                english: example.english,
                katakana: example.katakana,
                romaji: example.romaji,
                meaningVi: example.meaningVi,
                ...(example.note ? { note: example.note } : {}),
              })),
            }
          : {}),
      })),
    };
  }

  private async getDailyListening() {
    const [config, podcasts, presets] = await Promise.all([
      this.prisma.listeningConfig.findUnique({ where: { id: 1 } }),
      this.prisma.podcastResource.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.listeningPreset.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    return {
      goalMinutes: config?.goalMinutes ?? 15,
      podcasts: podcasts.map((p) => ({
        id: p.externalKey,
        title: p.title,
        desc: p.description,
        url: p.url,
        level: p.level,
      })),
      presets: presets.map((p) => ({
        id: p.externalKey,
        label: p.label,
        lessonFrom: p.lessonFrom,
        lessonTo: p.lessonTo,
        // externalKey theo quy ước "<level>-<tên>" (vd "n3-full") — suy ra cấp
        // JLPT từ đó để lọc playlist theo jlptLevel thay vì chỉ lessonNumber
        // range (các range JLPT "boost/expand" chồng lấn giữa các cấp).
        jlptLevel: p.externalKey.match(/^n([1-5])-/)?.[1]
          ? (`N${p.externalKey.match(/^n([1-5])-/)![1]}` as
              "N5" | "N4" | "N3" | "N2" | "N1")
          : undefined,
      })),
    };
  }

  private async getBookAudioFiles() {
    const [meta, items] = await Promise.all([
      this.prisma.bookAudioMeta.findUnique({ where: { id: 1 } }),
      this.prisma.bookAudioItem.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          folder: {
            include: { files: { orderBy: { sortOrder: "asc" } } },
          },
          files: { orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    if (!meta) {
      throw new NotFoundException("Book audio files not seeded");
    }

    const levelOrder = ["N5", "N4", "N3", "N2", "N1", "OTHER", "ANSWERS"];
    const grouped = new Map<string, typeof items>();
    for (const item of items) {
      const list = grouped.get(item.level) ?? [];
      list.push(item);
      grouped.set(item.level, list);
    }

    return {
      sourceUrl: meta.sourceUrl,
      publisher: meta.publisher,
      sections: levelOrder
        .filter((level) => grouped.has(level))
        .map((level) => ({
          level,
          label: this.bookAudioLevelLabel(level),
          items: (grouped.get(level) ?? []).map((item) => {
            const localFiles =
              item.files.length > 0 ? item.files : (item.folder?.files ?? []);
            return {
              id: item.externalKey,
              no: item.listNo ?? undefined,
              title: item.title,
              url: item.url,
              note: item.note ?? undefined,
              localFileCount: localFiles.length,
              localFiles: localFiles.map((f) => ({
                id: f.id,
                fileName: f.fileName,
                localPath: f.localPath,
                sizeBytes: f.sizeBytes ?? undefined,
              })),
            };
          }),
        })),
    };
  }

  private bookAudioLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      N5: "JLPT N5",
      N4: "JLPT N4",
      N3: "JLPT N3",
      N2: "JLPT N2",
      N1: "JLPT N1",
      OTHER: "Sách khác",
      ANSWERS: "Đáp án Minna",
    };
    return labels[level] ?? level;
  }

  private async getJlptRoadmap() {
    const [meta, tips, levels] = await Promise.all([
      this.prisma.jlptRoadmapMeta.findUnique({ where: { id: 1 } }),
      this.prisma.studyTip.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.jlptRoadmapLevel.findMany({
        include: {
          examSections: { orderBy: { sortOrder: "asc" } },
          materials: { orderBy: { sortOrder: "asc" } },
          phases: {
            orderBy: { sortOrder: "asc" },
            include: { tasks: { orderBy: { sortOrder: "asc" } } },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return {
      examScheduleNote: meta?.examScheduleNote ?? "",
      studyTips: tips.map((t) => t.text),
      levels: levels.map((level) => ({
        id: level.externalKey,
        label: level.label,
        badge: level.badge,
        color: level.color,
        duration: level.duration,
        vocabTarget: level.vocabTarget,
        kanjiTarget: level.kanjiTarget,
        grammarTarget: level.grammarTarget,
        vocabIncrement: level.vocabIncrement,
        kanjiIncrement: level.kanjiIncrement,
        grammarIncrement: level.grammarIncrement,
        passScore: level.passScore,
        summary: level.summary,
        examSections: level.examSections.map((s) => ({
          name: s.name,
          points: s.points,
          time: s.time,
        })),
        materials: level.materials.map((m) => ({
          title: m.title,
          desc: m.description,
          scope: m.scope,
          ...(m.inAppPath && m.inAppLabel
            ? { inApp: { to: m.inAppPath, label: m.inAppLabel } }
            : {}),
          ...(m.externalUrl && m.externalLabel
            ? { external: { url: m.externalUrl, label: m.externalLabel } }
            : {}),
        })),
        phases: level.phases.map((phase) => ({
          id: phase.externalKey,
          title: phase.title,
          subtitle: phase.subtitle,
          tasks: phase.tasks.map((task) => ({
            id: task.externalKey,
            text: task.text,
            ...(task.inAppPath && task.inAppLabel
              ? { inApp: { to: task.inAppPath, label: task.inAppLabel } }
              : {}),
            ...(task.externalUrl && task.externalLabel
              ? {
                  external: {
                    url: task.externalUrl,
                    label: task.externalLabel,
                  },
                }
              : {}),
          })),
        })),
      })),
    };
  }

  private async getHomePage() {
    const [stats, sections] = await Promise.all([
      this.prisma.homeStat.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.homeFeatureSection.findMany({
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return {
      stats: stats.map((stat) => ({
        value: stat.value,
        label: stat.label,
        suffix: stat.suffix,
      })),
      sections: sections.map((section) => ({
        id: section.slug,
        title: section.title,
        items: section.items.map((item) => ({
          href: item.href,
          icon: item.icon,
          title: item.title,
          desc: item.desc,
        })),
      })),
    };
  }

  private async getJapaneseConversation() {
    const [introLines, introSlots, phraseGroups] = await Promise.all([
      this.prisma.conversationIntroLine.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.conversationIntroSlot.findMany({
        include: { examples: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.conversationPhraseGroup.findMany({
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    if (!introLines.length && !phraseGroups.length) {
      throw new NotFoundException("Japanese conversation content not seeded");
    }

    return {
      introScript: introLines.map((line) => ({
        ja: line.ja,
        kana: line.kana,
        romaji: line.romaji,
        vi: line.vi,
        tip: line.tip ?? undefined,
      })),
      introSlots: introSlots.map((slot) => ({
        slot: slot.slot,
        question: slot.question,
        examples: slot.examples.map((ex) => ({
          ja: ex.ja,
          kana: ex.kana,
          romaji: ex.romaji,
          vi: ex.vi,
          note: ex.note ?? undefined,
        })),
      })),
      phraseGroups: phraseGroups.map((group) => ({
        id: group.slug,
        label: group.label,
        hint: group.hint,
        items: group.items.map((item) => ({
          ja: item.ja,
          kana: item.kana,
          romaji: item.romaji,
          vi: item.vi,
          note: item.note ?? undefined,
        })),
      })),
    };
  }

  private async getJapaneseRoleplay() {
    const scenes = await this.prisma.roleplayScene.findMany({
      include: { lines: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    if (!scenes.length) {
      throw new NotFoundException("Japanese roleplay content not seeded");
    }

    return {
      scenes: scenes.map((scene) => ({
        id: scene.slug,
        title: scene.title,
        titleJa: scene.titleJa,
        desc: scene.desc,
        lines: scene.lines.map((line) => ({
          role: line.role,
          ja: line.ja,
          vi: line.vi,
        })),
      })),
    };
  }

  private async getJlptDanangSchedule() {
    const [organizer, fees, briefing, sessions, venues, examDay] =
      await Promise.all([
        this.prisma.jlptOrganizer.findUnique({ where: { id: 1 } }),
        this.prisma.jlptExamFeeInfo.findUnique({ where: { id: 1 } }),
        this.prisma.jlptExamBriefing.findUnique({ where: { id: 1 } }),
        this.prisma.jlptExamSession.findMany({ orderBy: { sortOrder: "asc" } }),
        this.prisma.jlptExamVenue.findMany({ orderBy: { sortOrder: "asc" } }),
        this.prisma.jlptExamDaySlot.findMany({ orderBy: { sortOrder: "asc" } }),
      ]);

    if (!organizer || !fees || !briefing) {
      throw new NotFoundException("JLPT Đà Nẵng schedule not seeded");
    }

    return {
      organizer,
      fees,
      briefing: briefing.text,
      sessions: sessions.map((s) => ({
        id: s.externalKey,
        label: s.label,
        examDate: s.examDate,
        registrationPeriod: s.registrationPeriod,
        status: sessionStatusToApi(s.status),
        statusLabel: s.statusLabel,
        announcementUrl: s.announcementUrl ?? undefined,
      })),
      venues: venues.map((v) => ({
        address: v.address,
        district: v.district,
        levels: v.levels,
        note: v.note ?? undefined,
      })),
      examDay: examDay.map((slot) => ({
        levels: slot.levels,
        arriveAt: slot.arriveAt,
        startAt: slot.startAt,
        venue: slot.venue,
      })),
    };
  }
}
