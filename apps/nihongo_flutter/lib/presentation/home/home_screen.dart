import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routes.dart';
import '../../providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nihongo'),
        actions: [
          isOnline.when(
            data: (online) => Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Chip(
                avatar: Icon(
                  online ? Icons.cloud_done : Icons.cloud_off,
                  size: 16,
                  color: online ? scheme.primary : scheme.error,
                ),
                label: Text(online ? 'Online' : 'Offline'),
                backgroundColor: online
                    ? scheme.primaryContainer
                    : scheme.errorContainer,
              ),
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          // Hero
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: scheme.primaryContainer,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('🇯🇵',
                    style: Theme.of(context).textTheme.headlineLarge),
                const SizedBox(height: 8),
                Text(
                  'Học tiếng Nhật',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: scheme.onPrimaryContainer,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Offline-first · SM-2 SRS · AI Gemini',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onPrimaryContainer.withValues(alpha: 0.7),
                      ),
                ),
              ],
            ),
          ),

          _SectionLabel('HỌC TẬP'),
          _NavCard(
            icon: Icons.menu_book_rounded,
            title: 'Từ vựng',
            subtitle: 'Học theo bài Minna no Nihongo, nghe TTS',
            onTap: () => context.push(Routes.vocab),
          ),
          _NavCard(
            icon: Icons.style_rounded,
            title: 'Ôn tập SRS',
            subtitle: 'Spaced repetition SM-2 — 4 mức đánh giá',
            onTap: () => context.push(Routes.srs),
          ),

          _SectionLabel('LUYỆN TẬP'),
          _NavCard(
            icon: Icons.auto_awesome_rounded,
            title: 'Luyện câu AI',
            subtitle: 'Viết câu tiếng Nhật — Gemini sửa lỗi & giải thích',
            badge: 'MỚI',
            onTap: () => context.push(Routes.sentencePractice),
          ),
          _NavCard(
            icon: Icons.translate_rounded,
            title: 'Dịch camera',
            subtitle: 'Nhận chữ đang tạm tắt — chỉ xem trước camera',
            badge: 'TẠM TẮT',
            onTap: () => context.push(Routes.cameraTranslate),
          ),
          _NavCard(
            icon: Icons.mic_rounded,
            title: 'Luyện phát âm',
            subtitle: 'Nói tiếng Nhật, nhận xét điểm số',
            onTap: () => context.push(
              Routes.pronunciation,
              extra: {'kana': 'おはようございます', 'meaning': 'Chào buổi sáng'},
            ),
          ),
          _NavCard(
            icon: Icons.draw_rounded,
            title: 'Vẽ Kanji',
            subtitle: 'Luyện viết tay trên màn hình',
            onTap: () => context.push(
              Routes.kanjiDraw,
              extra: {'kanji': '行', 'kana': 'いく'},
            ),
          ),

          _SectionLabel('AI & LIVESTREAM'),
          _NavCard(
            icon: Icons.smart_toy_rounded,
            title: 'AI Tutor',
            subtitle: 'Hỏi ngữ pháp, từ vựng — Gemini trả lời',
            onTap: () => context.push(Routes.aiTutor),
          ),
          _NavCard(
            icon: Icons.live_tv_rounded,
            title: 'Livestream',
            subtitle: 'Xem coach dạy trực tiếp',
            onTap: () => context.push(Routes.live),
          ),

          const Divider(height: 32),
          _NavCard(
            icon: Icons.login_rounded,
            title: 'Đăng nhập',
            subtitle: 'Sync tiến độ SRS lên server',
            onTap: () => context.push(Routes.login),
          ),
        ],
      ),
    );
  }
}

// ── Widgets ───────────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8, top: 20),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              letterSpacing: 1.1,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _NavCard extends StatelessWidget {
  const _NavCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.badge,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: scheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon,
                    color: scheme.onPrimaryContainer, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (badge != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: scheme.primary,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              badge!,
                              style: TextStyle(
                                color: scheme.onPrimary,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right,
                  color: scheme.onSurfaceVariant, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
