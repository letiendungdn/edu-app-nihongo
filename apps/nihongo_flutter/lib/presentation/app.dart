import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/routes.dart';
import 'ai_tutor/ai_tutor_screen.dart';
import 'auth/login_screen.dart';
import 'camera/camera_translate_screen.dart'
    if (dart.library.html) 'camera/camera_translate_screen_stub.dart';
import 'home/home_screen.dart';
import 'kanji_draw/kanji_draw_screen.dart';
import 'live/live_host_screen.dart';
import 'live/live_list_screen.dart';
import 'live/live_viewer_screen.dart';
import '../../data/remote/live_api.dart';
import 'premium/premium_screen.dart';
import 'pronunciation/pronunciation_screen.dart';
import 'sentence_practice/sentence_practice_screen.dart';
import 'srs/srs_screen.dart';
import 'vocab/vocab_screen.dart';

// ── Design tokens (Clean Desk aesthetic) ────────────────────────────────────

// Light — warm cream desk surface
const _lightBg      = Color(0xFFF5F3EF);
const _lightSurface = Color(0xFFFFFFFF);
const _lightPrimary = Color(0xFFEF4444);

// Dark — deep navy
const _darkBg      = Color(0xFF0F172A);
const _darkSurface = Color(0xFF1E293B);
const _darkPrimary = Color(0xFFEF4444);

ThemeData _buildLight() {
  final base = ColorScheme.fromSeed(
    seedColor: _lightPrimary,
    brightness: Brightness.light,
  ).copyWith(
    surface: _lightSurface,
    onSurface: const Color(0xFF1C1917),
    onSurfaceVariant: const Color(0xFF78716C),
    surfaceContainerLowest: _lightBg,
    surfaceContainerLow: const Color(0xFFF0EDE8),
    surfaceContainer: const Color(0xFFEAE6E0),
    surfaceContainerHigh: const Color(0xFFE2DDD8),
    outline: const Color(0x1A000000),
    outlineVariant: const Color(0x0D000000),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: base,
    scaffoldBackgroundColor: _lightBg,
    cardTheme: CardThemeData(
      elevation: 0,
      color: _lightSurface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0x0F000000)),
      ),
      shadowColor: const Color(0x14000000),
      margin: EdgeInsets.zero,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: _lightBg,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      shadowColor: const Color(0x14000000),
      foregroundColor: const Color(0xFF1C1917),
      titleTextStyle: const TextStyle(
        color: Color(0xFF1C1917),
        fontSize: 18,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFFFFFFF),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0x14000000)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0x14000000)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: _lightPrimary, width: 1.5),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0x0D000000),
      thickness: 1,
      space: 1,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: const Color(0xFFFFFFFF),
      side: const BorderSide(color: Color(0x14000000)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  );
}

ThemeData _buildDark() {
  final base = ColorScheme.fromSeed(
    seedColor: _darkPrimary,
    brightness: Brightness.dark,
  ).copyWith(
    surface: _darkSurface,
    onSurface: const Color(0xFFF1F5F9),
    onSurfaceVariant: const Color(0xFF94A3B8),
    surfaceContainerLowest: _darkBg,
    surfaceContainerLow: const Color(0xFF162032),
    surfaceContainer: _darkSurface,
    surfaceContainerHigh: const Color(0xFF2D3F55),
    outline: const Color(0x1AFFFFFF),
    outlineVariant: const Color(0x0DFFFFFF),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: base,
    scaffoldBackgroundColor: _darkBg,
    cardTheme: CardThemeData(
      elevation: 0,
      color: _darkSurface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0x1AFFFFFF)),
      ),
      margin: EdgeInsets.zero,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: _darkBg,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      shadowColor: Colors.black54,
      foregroundColor: const Color(0xFFF1F5F9),
      titleTextStyle: const TextStyle(
        color: Color(0xFFF1F5F9),
        fontSize: 18,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: _darkSurface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0x1AFFFFFF)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0x1AFFFFFF)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: _darkPrimary, width: 1.5),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0x1AFFFFFF),
      thickness: 1,
      space: 1,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: _darkSurface,
      side: const BorderSide(color: Color(0x1AFFFFFF)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

class NihongoApp extends ConsumerWidget {
  const NihongoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Nihongo',
      debugShowCheckedModeBanner: false,
      theme: _buildLight(),
      darkTheme: _buildDark(),
      themeMode: ThemeMode.system,
      routerConfig: _router,
    );
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

final _router = GoRouter(
  initialLocation: Routes.home,
  routes: [
    GoRoute(path: Routes.home,             builder: (_, __) => const HomeScreen()),
    GoRoute(path: Routes.vocab,            builder: (_, __) => const VocabScreen()),
    GoRoute(path: Routes.srs,              builder: (_, __) => const SrsScreen()),
    GoRoute(path: Routes.sentencePractice, builder: (_, __) => const SentencePracticeScreen()),
    GoRoute(path: Routes.cameraTranslate,  builder: (_, __) => const CameraTranslateScreen()),
    GoRoute(path: Routes.live,             builder: (_, __) => const LiveListScreen()),
    GoRoute(
      path: Routes.liveViewer,
      builder: (_, state) => LiveViewerScreen(join: state.extra as LiveJoinResponse),
    ),
    GoRoute(
      path: Routes.liveHost,
      builder: (_, state) => LiveHostScreen(join: state.extra as LiveJoinResponse),
    ),
    GoRoute(path: Routes.login,   builder: (_, __) => const LoginScreen()),
    GoRoute(path: Routes.aiTutor, builder: (_, __) => const AiTutorScreen()),
    GoRoute(path: Routes.premium, builder: (_, __) => const PremiumScreen()),
    GoRoute(
      path: Routes.pronunciation,
      builder: (_, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return PronunciationScreen(
          kana: extra?['kana'] as String? ?? '',
          meaning: extra?['meaning'] as String? ?? '',
        );
      },
    ),
    GoRoute(
      path: Routes.kanjiDraw,
      builder: (_, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return KanjiDrawScreen(
          kanji: extra?['kanji'] as String? ?? '日',
          kana: extra?['kana'] as String? ?? 'にち',
        );
      },
    ),
  ],
);
