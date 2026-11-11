// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $VocabularyTableTable extends VocabularyTable
    with TableInfo<$VocabularyTableTable, VocabularyTableData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $VocabularyTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _lessonNumberMeta =
      const VerificationMeta('lessonNumber');
  @override
  late final GeneratedColumn<int> lessonNumber = GeneratedColumn<int>(
      'lesson_number', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _kanaMeta = const VerificationMeta('kana');
  @override
  late final GeneratedColumn<String> kana = GeneratedColumn<String>(
      'kana', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _kanjiMeta = const VerificationMeta('kanji');
  @override
  late final GeneratedColumn<String> kanji = GeneratedColumn<String>(
      'kanji', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _meaningMeta =
      const VerificationMeta('meaning');
  @override
  late final GeneratedColumn<String> meaning = GeneratedColumn<String>(
      'meaning', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _romajiMeta = const VerificationMeta('romaji');
  @override
  late final GeneratedColumn<String> romaji = GeneratedColumn<String>(
      'romaji', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _sortOrderMeta =
      const VerificationMeta('sortOrder');
  @override
  late final GeneratedColumn<int> sortOrder = GeneratedColumn<int>(
      'sort_order', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('synced'));
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _meaningEnMeta =
      const VerificationMeta('meaningEn');
  @override
  late final GeneratedColumn<String> meaningEn = GeneratedColumn<String>(
      'meaning_en', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _meaningEnSourceMeta =
      const VerificationMeta('meaningEnSource');
  @override
  late final GeneratedColumn<String> meaningEnSource = GeneratedColumn<String>(
      'meaning_en_source', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _hanVietMeta =
      const VerificationMeta('hanViet');
  @override
  late final GeneratedColumn<String> hanViet = GeneratedColumn<String>(
      'han_viet', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _furiganaMeta =
      const VerificationMeta('furigana');
  @override
  late final GeneratedColumn<String> furigana = GeneratedColumn<String>(
      'furigana', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        lessonNumber,
        kana,
        kanji,
        meaning,
        romaji,
        sortOrder,
        syncStatus,
        updatedAt,
        meaningEn,
        meaningEnSource,
        hanViet,
        furigana
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'vocabulary';
  @override
  VerificationContext validateIntegrity(
      Insertable<VocabularyTableData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('lesson_number')) {
      context.handle(
          _lessonNumberMeta,
          lessonNumber.isAcceptableOrUnknown(
              data['lesson_number']!, _lessonNumberMeta));
    } else if (isInserting) {
      context.missing(_lessonNumberMeta);
    }
    if (data.containsKey('kana')) {
      context.handle(
          _kanaMeta, kana.isAcceptableOrUnknown(data['kana']!, _kanaMeta));
    } else if (isInserting) {
      context.missing(_kanaMeta);
    }
    if (data.containsKey('kanji')) {
      context.handle(
          _kanjiMeta, kanji.isAcceptableOrUnknown(data['kanji']!, _kanjiMeta));
    }
    if (data.containsKey('meaning')) {
      context.handle(_meaningMeta,
          meaning.isAcceptableOrUnknown(data['meaning']!, _meaningMeta));
    } else if (isInserting) {
      context.missing(_meaningMeta);
    }
    if (data.containsKey('romaji')) {
      context.handle(_romajiMeta,
          romaji.isAcceptableOrUnknown(data['romaji']!, _romajiMeta));
    }
    if (data.containsKey('sort_order')) {
      context.handle(_sortOrderMeta,
          sortOrder.isAcceptableOrUnknown(data['sort_order']!, _sortOrderMeta));
    } else if (isInserting) {
      context.missing(_sortOrderMeta);
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('meaning_en')) {
      context.handle(_meaningEnMeta,
          meaningEn.isAcceptableOrUnknown(data['meaning_en']!, _meaningEnMeta));
    }
    if (data.containsKey('meaning_en_source')) {
      context.handle(
          _meaningEnSourceMeta,
          meaningEnSource.isAcceptableOrUnknown(
              data['meaning_en_source']!, _meaningEnSourceMeta));
    }
    if (data.containsKey('han_viet')) {
      context.handle(_hanVietMeta,
          hanViet.isAcceptableOrUnknown(data['han_viet']!, _hanVietMeta));
    }
    if (data.containsKey('furigana')) {
      context.handle(_furiganaMeta,
          furigana.isAcceptableOrUnknown(data['furigana']!, _furiganaMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  VocabularyTableData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return VocabularyTableData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      lessonNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}lesson_number'])!,
      kana: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kana'])!,
      kanji: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kanji']),
      meaning: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}meaning'])!,
      romaji: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}romaji'])!,
      sortOrder: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sort_order'])!,
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
      meaningEn: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}meaning_en']),
      meaningEnSource: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}meaning_en_source']),
      hanViet: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}han_viet']),
      furigana: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}furigana']),
    );
  }

  @override
  $VocabularyTableTable createAlias(String alias) {
    return $VocabularyTableTable(attachedDatabase, alias);
  }
}

class VocabularyTableData extends DataClass
    implements Insertable<VocabularyTableData> {
  final int id;
  final int lessonNumber;
  final String kana;
  final String? kanji;
  final String meaning;
  final String romaji;
  final int sortOrder;
  final String syncStatus;
  final int updatedAt;
  final String? meaningEn;
  final String? meaningEnSource;
  final String? hanViet;
  final String? furigana;
  const VocabularyTableData(
      {required this.id,
      required this.lessonNumber,
      required this.kana,
      this.kanji,
      required this.meaning,
      required this.romaji,
      required this.sortOrder,
      required this.syncStatus,
      required this.updatedAt,
      this.meaningEn,
      this.meaningEnSource,
      this.hanViet,
      this.furigana});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['lesson_number'] = Variable<int>(lessonNumber);
    map['kana'] = Variable<String>(kana);
    if (!nullToAbsent || kanji != null) {
      map['kanji'] = Variable<String>(kanji);
    }
    map['meaning'] = Variable<String>(meaning);
    map['romaji'] = Variable<String>(romaji);
    map['sort_order'] = Variable<int>(sortOrder);
    map['sync_status'] = Variable<String>(syncStatus);
    map['updated_at'] = Variable<int>(updatedAt);
    if (!nullToAbsent || meaningEn != null) {
      map['meaning_en'] = Variable<String>(meaningEn);
    }
    if (!nullToAbsent || meaningEnSource != null) {
      map['meaning_en_source'] = Variable<String>(meaningEnSource);
    }
    if (!nullToAbsent || hanViet != null) {
      map['han_viet'] = Variable<String>(hanViet);
    }
    if (!nullToAbsent || furigana != null) {
      map['furigana'] = Variable<String>(furigana);
    }
    return map;
  }

  VocabularyTableCompanion toCompanion(bool nullToAbsent) {
    return VocabularyTableCompanion(
      id: Value(id),
      lessonNumber: Value(lessonNumber),
      kana: Value(kana),
      kanji:
          kanji == null && nullToAbsent ? const Value.absent() : Value(kanji),
      meaning: Value(meaning),
      romaji: Value(romaji),
      sortOrder: Value(sortOrder),
      syncStatus: Value(syncStatus),
      updatedAt: Value(updatedAt),
      meaningEn: meaningEn == null && nullToAbsent
          ? const Value.absent()
          : Value(meaningEn),
      meaningEnSource: meaningEnSource == null && nullToAbsent
          ? const Value.absent()
          : Value(meaningEnSource),
      hanViet: hanViet == null && nullToAbsent
          ? const Value.absent()
          : Value(hanViet),
      furigana: furigana == null && nullToAbsent
          ? const Value.absent()
          : Value(furigana),
    );
  }

  factory VocabularyTableData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return VocabularyTableData(
      id: serializer.fromJson<int>(json['id']),
      lessonNumber: serializer.fromJson<int>(json['lessonNumber']),
      kana: serializer.fromJson<String>(json['kana']),
      kanji: serializer.fromJson<String?>(json['kanji']),
      meaning: serializer.fromJson<String>(json['meaning']),
      romaji: serializer.fromJson<String>(json['romaji']),
      sortOrder: serializer.fromJson<int>(json['sortOrder']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
      meaningEn: serializer.fromJson<String?>(json['meaningEn']),
      meaningEnSource: serializer.fromJson<String?>(json['meaningEnSource']),
      hanViet: serializer.fromJson<String?>(json['hanViet']),
      furigana: serializer.fromJson<String?>(json['furigana']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'lessonNumber': serializer.toJson<int>(lessonNumber),
      'kana': serializer.toJson<String>(kana),
      'kanji': serializer.toJson<String?>(kanji),
      'meaning': serializer.toJson<String>(meaning),
      'romaji': serializer.toJson<String>(romaji),
      'sortOrder': serializer.toJson<int>(sortOrder),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'updatedAt': serializer.toJson<int>(updatedAt),
      'meaningEn': serializer.toJson<String?>(meaningEn),
      'meaningEnSource': serializer.toJson<String?>(meaningEnSource),
      'hanViet': serializer.toJson<String?>(hanViet),
      'furigana': serializer.toJson<String?>(furigana),
    };
  }

  VocabularyTableData copyWith(
          {int? id,
          int? lessonNumber,
          String? kana,
          Value<String?> kanji = const Value.absent(),
          String? meaning,
          String? romaji,
          int? sortOrder,
          String? syncStatus,
          int? updatedAt,
          Value<String?> meaningEn = const Value.absent(),
          Value<String?> meaningEnSource = const Value.absent(),
          Value<String?> hanViet = const Value.absent(),
          Value<String?> furigana = const Value.absent()}) =>
      VocabularyTableData(
        id: id ?? this.id,
        lessonNumber: lessonNumber ?? this.lessonNumber,
        kana: kana ?? this.kana,
        kanji: kanji.present ? kanji.value : this.kanji,
        meaning: meaning ?? this.meaning,
        romaji: romaji ?? this.romaji,
        sortOrder: sortOrder ?? this.sortOrder,
        syncStatus: syncStatus ?? this.syncStatus,
        updatedAt: updatedAt ?? this.updatedAt,
        meaningEn: meaningEn.present ? meaningEn.value : this.meaningEn,
        meaningEnSource: meaningEnSource.present
            ? meaningEnSource.value
            : this.meaningEnSource,
        hanViet: hanViet.present ? hanViet.value : this.hanViet,
        furigana: furigana.present ? furigana.value : this.furigana,
      );
  VocabularyTableData copyWithCompanion(VocabularyTableCompanion data) {
    return VocabularyTableData(
      id: data.id.present ? data.id.value : this.id,
      lessonNumber: data.lessonNumber.present
          ? data.lessonNumber.value
          : this.lessonNumber,
      kana: data.kana.present ? data.kana.value : this.kana,
      kanji: data.kanji.present ? data.kanji.value : this.kanji,
      meaning: data.meaning.present ? data.meaning.value : this.meaning,
      romaji: data.romaji.present ? data.romaji.value : this.romaji,
      sortOrder: data.sortOrder.present ? data.sortOrder.value : this.sortOrder,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      meaningEn: data.meaningEn.present ? data.meaningEn.value : this.meaningEn,
      meaningEnSource: data.meaningEnSource.present
          ? data.meaningEnSource.value
          : this.meaningEnSource,
      hanViet: data.hanViet.present ? data.hanViet.value : this.hanViet,
      furigana: data.furigana.present ? data.furigana.value : this.furigana,
    );
  }

  @override
  String toString() {
    return (StringBuffer('VocabularyTableData(')
          ..write('id: $id, ')
          ..write('lessonNumber: $lessonNumber, ')
          ..write('kana: $kana, ')
          ..write('kanji: $kanji, ')
          ..write('meaning: $meaning, ')
          ..write('romaji: $romaji, ')
          ..write('sortOrder: $sortOrder, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('meaningEn: $meaningEn, ')
          ..write('meaningEnSource: $meaningEnSource, ')
          ..write('hanViet: $hanViet, ')
          ..write('furigana: $furigana')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      lessonNumber,
      kana,
      kanji,
      meaning,
      romaji,
      sortOrder,
      syncStatus,
      updatedAt,
      meaningEn,
      meaningEnSource,
      hanViet,
      furigana);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is VocabularyTableData &&
          other.id == this.id &&
          other.lessonNumber == this.lessonNumber &&
          other.kana == this.kana &&
          other.kanji == this.kanji &&
          other.meaning == this.meaning &&
          other.romaji == this.romaji &&
          other.sortOrder == this.sortOrder &&
          other.syncStatus == this.syncStatus &&
          other.updatedAt == this.updatedAt &&
          other.meaningEn == this.meaningEn &&
          other.meaningEnSource == this.meaningEnSource &&
          other.hanViet == this.hanViet &&
          other.furigana == this.furigana);
}

class VocabularyTableCompanion extends UpdateCompanion<VocabularyTableData> {
  final Value<int> id;
  final Value<int> lessonNumber;
  final Value<String> kana;
  final Value<String?> kanji;
  final Value<String> meaning;
  final Value<String> romaji;
  final Value<int> sortOrder;
  final Value<String> syncStatus;
  final Value<int> updatedAt;
  final Value<String?> meaningEn;
  final Value<String?> meaningEnSource;
  final Value<String?> hanViet;
  final Value<String?> furigana;
  const VocabularyTableCompanion({
    this.id = const Value.absent(),
    this.lessonNumber = const Value.absent(),
    this.kana = const Value.absent(),
    this.kanji = const Value.absent(),
    this.meaning = const Value.absent(),
    this.romaji = const Value.absent(),
    this.sortOrder = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.meaningEn = const Value.absent(),
    this.meaningEnSource = const Value.absent(),
    this.hanViet = const Value.absent(),
    this.furigana = const Value.absent(),
  });
  VocabularyTableCompanion.insert({
    this.id = const Value.absent(),
    required int lessonNumber,
    required String kana,
    this.kanji = const Value.absent(),
    required String meaning,
    this.romaji = const Value.absent(),
    required int sortOrder,
    this.syncStatus = const Value.absent(),
    required int updatedAt,
    this.meaningEn = const Value.absent(),
    this.meaningEnSource = const Value.absent(),
    this.hanViet = const Value.absent(),
    this.furigana = const Value.absent(),
  })  : lessonNumber = Value(lessonNumber),
        kana = Value(kana),
        meaning = Value(meaning),
        sortOrder = Value(sortOrder),
        updatedAt = Value(updatedAt);
  static Insertable<VocabularyTableData> custom({
    Expression<int>? id,
    Expression<int>? lessonNumber,
    Expression<String>? kana,
    Expression<String>? kanji,
    Expression<String>? meaning,
    Expression<String>? romaji,
    Expression<int>? sortOrder,
    Expression<String>? syncStatus,
    Expression<int>? updatedAt,
    Expression<String>? meaningEn,
    Expression<String>? meaningEnSource,
    Expression<String>? hanViet,
    Expression<String>? furigana,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (lessonNumber != null) 'lesson_number': lessonNumber,
      if (kana != null) 'kana': kana,
      if (kanji != null) 'kanji': kanji,
      if (meaning != null) 'meaning': meaning,
      if (romaji != null) 'romaji': romaji,
      if (sortOrder != null) 'sort_order': sortOrder,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (meaningEn != null) 'meaning_en': meaningEn,
      if (meaningEnSource != null) 'meaning_en_source': meaningEnSource,
      if (hanViet != null) 'han_viet': hanViet,
      if (furigana != null) 'furigana': furigana,
    });
  }

  VocabularyTableCompanion copyWith(
      {Value<int>? id,
      Value<int>? lessonNumber,
      Value<String>? kana,
      Value<String?>? kanji,
      Value<String>? meaning,
      Value<String>? romaji,
      Value<int>? sortOrder,
      Value<String>? syncStatus,
      Value<int>? updatedAt,
      Value<String?>? meaningEn,
      Value<String?>? meaningEnSource,
      Value<String?>? hanViet,
      Value<String?>? furigana}) {
    return VocabularyTableCompanion(
      id: id ?? this.id,
      lessonNumber: lessonNumber ?? this.lessonNumber,
      kana: kana ?? this.kana,
      kanji: kanji ?? this.kanji,
      meaning: meaning ?? this.meaning,
      romaji: romaji ?? this.romaji,
      sortOrder: sortOrder ?? this.sortOrder,
      syncStatus: syncStatus ?? this.syncStatus,
      updatedAt: updatedAt ?? this.updatedAt,
      meaningEn: meaningEn ?? this.meaningEn,
      meaningEnSource: meaningEnSource ?? this.meaningEnSource,
      hanViet: hanViet ?? this.hanViet,
      furigana: furigana ?? this.furigana,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (lessonNumber.present) {
      map['lesson_number'] = Variable<int>(lessonNumber.value);
    }
    if (kana.present) {
      map['kana'] = Variable<String>(kana.value);
    }
    if (kanji.present) {
      map['kanji'] = Variable<String>(kanji.value);
    }
    if (meaning.present) {
      map['meaning'] = Variable<String>(meaning.value);
    }
    if (romaji.present) {
      map['romaji'] = Variable<String>(romaji.value);
    }
    if (sortOrder.present) {
      map['sort_order'] = Variable<int>(sortOrder.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    if (meaningEn.present) {
      map['meaning_en'] = Variable<String>(meaningEn.value);
    }
    if (meaningEnSource.present) {
      map['meaning_en_source'] = Variable<String>(meaningEnSource.value);
    }
    if (hanViet.present) {
      map['han_viet'] = Variable<String>(hanViet.value);
    }
    if (furigana.present) {
      map['furigana'] = Variable<String>(furigana.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('VocabularyTableCompanion(')
          ..write('id: $id, ')
          ..write('lessonNumber: $lessonNumber, ')
          ..write('kana: $kana, ')
          ..write('kanji: $kanji, ')
          ..write('meaning: $meaning, ')
          ..write('romaji: $romaji, ')
          ..write('sortOrder: $sortOrder, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('meaningEn: $meaningEn, ')
          ..write('meaningEnSource: $meaningEnSource, ')
          ..write('hanViet: $hanViet, ')
          ..write('furigana: $furigana')
          ..write(')'))
        .toString();
  }
}

class $SrsCardTableTable extends SrsCardTable
    with TableInfo<$SrsCardTableTable, SrsCardTableData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SrsCardTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _vocabularyIdMeta =
      const VerificationMeta('vocabularyId');
  @override
  late final GeneratedColumn<int> vocabularyId = GeneratedColumn<int>(
      'vocabulary_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES vocabulary (id)'));
  static const VerificationMeta _easeFactorMeta =
      const VerificationMeta('easeFactor');
  @override
  late final GeneratedColumn<double> easeFactor = GeneratedColumn<double>(
      'ease_factor', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: false,
      defaultValue: const Constant(2.5));
  static const VerificationMeta _intervalMeta =
      const VerificationMeta('interval');
  @override
  late final GeneratedColumn<int> interval = GeneratedColumn<int>(
      'interval', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _repetitionsMeta =
      const VerificationMeta('repetitions');
  @override
  late final GeneratedColumn<int> repetitions = GeneratedColumn<int>(
      'repetitions', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _nextReviewAtMeta =
      const VerificationMeta('nextReviewAt');
  @override
  late final GeneratedColumn<int> nextReviewAt = GeneratedColumn<int>(
      'next_review_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _masteredMeta =
      const VerificationMeta('mastered');
  @override
  late final GeneratedColumn<bool> mastered = GeneratedColumn<bool>(
      'mastered', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("mastered" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('synced'));
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        vocabularyId,
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
        mastered,
        syncStatus,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'srs_card';
  @override
  VerificationContext validateIntegrity(Insertable<SrsCardTableData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('vocabulary_id')) {
      context.handle(
          _vocabularyIdMeta,
          vocabularyId.isAcceptableOrUnknown(
              data['vocabulary_id']!, _vocabularyIdMeta));
    } else if (isInserting) {
      context.missing(_vocabularyIdMeta);
    }
    if (data.containsKey('ease_factor')) {
      context.handle(
          _easeFactorMeta,
          easeFactor.isAcceptableOrUnknown(
              data['ease_factor']!, _easeFactorMeta));
    }
    if (data.containsKey('interval')) {
      context.handle(_intervalMeta,
          interval.isAcceptableOrUnknown(data['interval']!, _intervalMeta));
    }
    if (data.containsKey('repetitions')) {
      context.handle(
          _repetitionsMeta,
          repetitions.isAcceptableOrUnknown(
              data['repetitions']!, _repetitionsMeta));
    }
    if (data.containsKey('next_review_at')) {
      context.handle(
          _nextReviewAtMeta,
          nextReviewAt.isAcceptableOrUnknown(
              data['next_review_at']!, _nextReviewAtMeta));
    } else if (isInserting) {
      context.missing(_nextReviewAtMeta);
    }
    if (data.containsKey('mastered')) {
      context.handle(_masteredMeta,
          mastered.isAcceptableOrUnknown(data['mastered']!, _masteredMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SrsCardTableData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SrsCardTableData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      vocabularyId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}vocabulary_id'])!,
      easeFactor: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}ease_factor'])!,
      interval: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}interval'])!,
      repetitions: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}repetitions'])!,
      nextReviewAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}next_review_at'])!,
      mastered: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}mastered'])!,
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $SrsCardTableTable createAlias(String alias) {
    return $SrsCardTableTable(attachedDatabase, alias);
  }
}

class SrsCardTableData extends DataClass
    implements Insertable<SrsCardTableData> {
  final int id;
  final int vocabularyId;
  final double easeFactor;
  final int interval;
  final int repetitions;
  final int nextReviewAt;
  final bool mastered;
  final String syncStatus;
  final int updatedAt;
  const SrsCardTableData(
      {required this.id,
      required this.vocabularyId,
      required this.easeFactor,
      required this.interval,
      required this.repetitions,
      required this.nextReviewAt,
      required this.mastered,
      required this.syncStatus,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['vocabulary_id'] = Variable<int>(vocabularyId);
    map['ease_factor'] = Variable<double>(easeFactor);
    map['interval'] = Variable<int>(interval);
    map['repetitions'] = Variable<int>(repetitions);
    map['next_review_at'] = Variable<int>(nextReviewAt);
    map['mastered'] = Variable<bool>(mastered);
    map['sync_status'] = Variable<String>(syncStatus);
    map['updated_at'] = Variable<int>(updatedAt);
    return map;
  }

  SrsCardTableCompanion toCompanion(bool nullToAbsent) {
    return SrsCardTableCompanion(
      id: Value(id),
      vocabularyId: Value(vocabularyId),
      easeFactor: Value(easeFactor),
      interval: Value(interval),
      repetitions: Value(repetitions),
      nextReviewAt: Value(nextReviewAt),
      mastered: Value(mastered),
      syncStatus: Value(syncStatus),
      updatedAt: Value(updatedAt),
    );
  }

  factory SrsCardTableData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SrsCardTableData(
      id: serializer.fromJson<int>(json['id']),
      vocabularyId: serializer.fromJson<int>(json['vocabularyId']),
      easeFactor: serializer.fromJson<double>(json['easeFactor']),
      interval: serializer.fromJson<int>(json['interval']),
      repetitions: serializer.fromJson<int>(json['repetitions']),
      nextReviewAt: serializer.fromJson<int>(json['nextReviewAt']),
      mastered: serializer.fromJson<bool>(json['mastered']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'vocabularyId': serializer.toJson<int>(vocabularyId),
      'easeFactor': serializer.toJson<double>(easeFactor),
      'interval': serializer.toJson<int>(interval),
      'repetitions': serializer.toJson<int>(repetitions),
      'nextReviewAt': serializer.toJson<int>(nextReviewAt),
      'mastered': serializer.toJson<bool>(mastered),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'updatedAt': serializer.toJson<int>(updatedAt),
    };
  }

  SrsCardTableData copyWith(
          {int? id,
          int? vocabularyId,
          double? easeFactor,
          int? interval,
          int? repetitions,
          int? nextReviewAt,
          bool? mastered,
          String? syncStatus,
          int? updatedAt}) =>
      SrsCardTableData(
        id: id ?? this.id,
        vocabularyId: vocabularyId ?? this.vocabularyId,
        easeFactor: easeFactor ?? this.easeFactor,
        interval: interval ?? this.interval,
        repetitions: repetitions ?? this.repetitions,
        nextReviewAt: nextReviewAt ?? this.nextReviewAt,
        mastered: mastered ?? this.mastered,
        syncStatus: syncStatus ?? this.syncStatus,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  SrsCardTableData copyWithCompanion(SrsCardTableCompanion data) {
    return SrsCardTableData(
      id: data.id.present ? data.id.value : this.id,
      vocabularyId: data.vocabularyId.present
          ? data.vocabularyId.value
          : this.vocabularyId,
      easeFactor:
          data.easeFactor.present ? data.easeFactor.value : this.easeFactor,
      interval: data.interval.present ? data.interval.value : this.interval,
      repetitions:
          data.repetitions.present ? data.repetitions.value : this.repetitions,
      nextReviewAt: data.nextReviewAt.present
          ? data.nextReviewAt.value
          : this.nextReviewAt,
      mastered: data.mastered.present ? data.mastered.value : this.mastered,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SrsCardTableData(')
          ..write('id: $id, ')
          ..write('vocabularyId: $vocabularyId, ')
          ..write('easeFactor: $easeFactor, ')
          ..write('interval: $interval, ')
          ..write('repetitions: $repetitions, ')
          ..write('nextReviewAt: $nextReviewAt, ')
          ..write('mastered: $mastered, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, vocabularyId, easeFactor, interval,
      repetitions, nextReviewAt, mastered, syncStatus, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SrsCardTableData &&
          other.id == this.id &&
          other.vocabularyId == this.vocabularyId &&
          other.easeFactor == this.easeFactor &&
          other.interval == this.interval &&
          other.repetitions == this.repetitions &&
          other.nextReviewAt == this.nextReviewAt &&
          other.mastered == this.mastered &&
          other.syncStatus == this.syncStatus &&
          other.updatedAt == this.updatedAt);
}

class SrsCardTableCompanion extends UpdateCompanion<SrsCardTableData> {
  final Value<int> id;
  final Value<int> vocabularyId;
  final Value<double> easeFactor;
  final Value<int> interval;
  final Value<int> repetitions;
  final Value<int> nextReviewAt;
  final Value<bool> mastered;
  final Value<String> syncStatus;
  final Value<int> updatedAt;
  const SrsCardTableCompanion({
    this.id = const Value.absent(),
    this.vocabularyId = const Value.absent(),
    this.easeFactor = const Value.absent(),
    this.interval = const Value.absent(),
    this.repetitions = const Value.absent(),
    this.nextReviewAt = const Value.absent(),
    this.mastered = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  SrsCardTableCompanion.insert({
    this.id = const Value.absent(),
    required int vocabularyId,
    this.easeFactor = const Value.absent(),
    this.interval = const Value.absent(),
    this.repetitions = const Value.absent(),
    required int nextReviewAt,
    this.mastered = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required int updatedAt,
  })  : vocabularyId = Value(vocabularyId),
        nextReviewAt = Value(nextReviewAt),
        updatedAt = Value(updatedAt);
  static Insertable<SrsCardTableData> custom({
    Expression<int>? id,
    Expression<int>? vocabularyId,
    Expression<double>? easeFactor,
    Expression<int>? interval,
    Expression<int>? repetitions,
    Expression<int>? nextReviewAt,
    Expression<bool>? mastered,
    Expression<String>? syncStatus,
    Expression<int>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (vocabularyId != null) 'vocabulary_id': vocabularyId,
      if (easeFactor != null) 'ease_factor': easeFactor,
      if (interval != null) 'interval': interval,
      if (repetitions != null) 'repetitions': repetitions,
      if (nextReviewAt != null) 'next_review_at': nextReviewAt,
      if (mastered != null) 'mastered': mastered,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  SrsCardTableCompanion copyWith(
      {Value<int>? id,
      Value<int>? vocabularyId,
      Value<double>? easeFactor,
      Value<int>? interval,
      Value<int>? repetitions,
      Value<int>? nextReviewAt,
      Value<bool>? mastered,
      Value<String>? syncStatus,
      Value<int>? updatedAt}) {
    return SrsCardTableCompanion(
      id: id ?? this.id,
      vocabularyId: vocabularyId ?? this.vocabularyId,
      easeFactor: easeFactor ?? this.easeFactor,
      interval: interval ?? this.interval,
      repetitions: repetitions ?? this.repetitions,
      nextReviewAt: nextReviewAt ?? this.nextReviewAt,
      mastered: mastered ?? this.mastered,
      syncStatus: syncStatus ?? this.syncStatus,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (vocabularyId.present) {
      map['vocabulary_id'] = Variable<int>(vocabularyId.value);
    }
    if (easeFactor.present) {
      map['ease_factor'] = Variable<double>(easeFactor.value);
    }
    if (interval.present) {
      map['interval'] = Variable<int>(interval.value);
    }
    if (repetitions.present) {
      map['repetitions'] = Variable<int>(repetitions.value);
    }
    if (nextReviewAt.present) {
      map['next_review_at'] = Variable<int>(nextReviewAt.value);
    }
    if (mastered.present) {
      map['mastered'] = Variable<bool>(mastered.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SrsCardTableCompanion(')
          ..write('id: $id, ')
          ..write('vocabularyId: $vocabularyId, ')
          ..write('easeFactor: $easeFactor, ')
          ..write('interval: $interval, ')
          ..write('repetitions: $repetitions, ')
          ..write('nextReviewAt: $nextReviewAt, ')
          ..write('mastered: $mastered, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

class $SyncQueueTableTable extends SyncQueueTable
    with TableInfo<$SyncQueueTableTable, SyncQueueTableData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncQueueTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _operationMeta =
      const VerificationMeta('operation');
  @override
  late final GeneratedColumn<String> operation = GeneratedColumn<String>(
      'operation', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _entityIdMeta =
      const VerificationMeta('entityId');
  @override
  late final GeneratedColumn<int> entityId = GeneratedColumn<int>(
      'entity_id', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _payloadMeta =
      const VerificationMeta('payload');
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
      'payload', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns =>
      [id, operation, entityId, payload, retryCount, createdAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_queue';
  @override
  VerificationContext validateIntegrity(Insertable<SyncQueueTableData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('operation')) {
      context.handle(_operationMeta,
          operation.isAcceptableOrUnknown(data['operation']!, _operationMeta));
    } else if (isInserting) {
      context.missing(_operationMeta);
    }
    if (data.containsKey('entity_id')) {
      context.handle(_entityIdMeta,
          entityId.isAcceptableOrUnknown(data['entity_id']!, _entityIdMeta));
    } else if (isInserting) {
      context.missing(_entityIdMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(_payloadMeta,
          payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta));
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SyncQueueTableData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncQueueTableData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      operation: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}operation'])!,
      entityId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}entity_id'])!,
      payload: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payload'])!,
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
    );
  }

  @override
  $SyncQueueTableTable createAlias(String alias) {
    return $SyncQueueTableTable(attachedDatabase, alias);
  }
}

class SyncQueueTableData extends DataClass
    implements Insertable<SyncQueueTableData> {
  final int id;
  final String operation;
  final int entityId;
  final String payload;
  final int retryCount;
  final int createdAt;
  const SyncQueueTableData(
      {required this.id,
      required this.operation,
      required this.entityId,
      required this.payload,
      required this.retryCount,
      required this.createdAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['operation'] = Variable<String>(operation);
    map['entity_id'] = Variable<int>(entityId);
    map['payload'] = Variable<String>(payload);
    map['retry_count'] = Variable<int>(retryCount);
    map['created_at'] = Variable<int>(createdAt);
    return map;
  }

  SyncQueueTableCompanion toCompanion(bool nullToAbsent) {
    return SyncQueueTableCompanion(
      id: Value(id),
      operation: Value(operation),
      entityId: Value(entityId),
      payload: Value(payload),
      retryCount: Value(retryCount),
      createdAt: Value(createdAt),
    );
  }

  factory SyncQueueTableData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncQueueTableData(
      id: serializer.fromJson<int>(json['id']),
      operation: serializer.fromJson<String>(json['operation']),
      entityId: serializer.fromJson<int>(json['entityId']),
      payload: serializer.fromJson<String>(json['payload']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'operation': serializer.toJson<String>(operation),
      'entityId': serializer.toJson<int>(entityId),
      'payload': serializer.toJson<String>(payload),
      'retryCount': serializer.toJson<int>(retryCount),
      'createdAt': serializer.toJson<int>(createdAt),
    };
  }

  SyncQueueTableData copyWith(
          {int? id,
          String? operation,
          int? entityId,
          String? payload,
          int? retryCount,
          int? createdAt}) =>
      SyncQueueTableData(
        id: id ?? this.id,
        operation: operation ?? this.operation,
        entityId: entityId ?? this.entityId,
        payload: payload ?? this.payload,
        retryCount: retryCount ?? this.retryCount,
        createdAt: createdAt ?? this.createdAt,
      );
  SyncQueueTableData copyWithCompanion(SyncQueueTableCompanion data) {
    return SyncQueueTableData(
      id: data.id.present ? data.id.value : this.id,
      operation: data.operation.present ? data.operation.value : this.operation,
      entityId: data.entityId.present ? data.entityId.value : this.entityId,
      payload: data.payload.present ? data.payload.value : this.payload,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueTableData(')
          ..write('id: $id, ')
          ..write('operation: $operation, ')
          ..write('entityId: $entityId, ')
          ..write('payload: $payload, ')
          ..write('retryCount: $retryCount, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, operation, entityId, payload, retryCount, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncQueueTableData &&
          other.id == this.id &&
          other.operation == this.operation &&
          other.entityId == this.entityId &&
          other.payload == this.payload &&
          other.retryCount == this.retryCount &&
          other.createdAt == this.createdAt);
}

class SyncQueueTableCompanion extends UpdateCompanion<SyncQueueTableData> {
  final Value<int> id;
  final Value<String> operation;
  final Value<int> entityId;
  final Value<String> payload;
  final Value<int> retryCount;
  final Value<int> createdAt;
  const SyncQueueTableCompanion({
    this.id = const Value.absent(),
    this.operation = const Value.absent(),
    this.entityId = const Value.absent(),
    this.payload = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  SyncQueueTableCompanion.insert({
    this.id = const Value.absent(),
    required String operation,
    required int entityId,
    required String payload,
    this.retryCount = const Value.absent(),
    required int createdAt,
  })  : operation = Value(operation),
        entityId = Value(entityId),
        payload = Value(payload),
        createdAt = Value(createdAt);
  static Insertable<SyncQueueTableData> custom({
    Expression<int>? id,
    Expression<String>? operation,
    Expression<int>? entityId,
    Expression<String>? payload,
    Expression<int>? retryCount,
    Expression<int>? createdAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operation != null) 'operation': operation,
      if (entityId != null) 'entity_id': entityId,
      if (payload != null) 'payload': payload,
      if (retryCount != null) 'retry_count': retryCount,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  SyncQueueTableCompanion copyWith(
      {Value<int>? id,
      Value<String>? operation,
      Value<int>? entityId,
      Value<String>? payload,
      Value<int>? retryCount,
      Value<int>? createdAt}) {
    return SyncQueueTableCompanion(
      id: id ?? this.id,
      operation: operation ?? this.operation,
      entityId: entityId ?? this.entityId,
      payload: payload ?? this.payload,
      retryCount: retryCount ?? this.retryCount,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (operation.present) {
      map['operation'] = Variable<String>(operation.value);
    }
    if (entityId.present) {
      map['entity_id'] = Variable<int>(entityId.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueTableCompanion(')
          ..write('id: $id, ')
          ..write('operation: $operation, ')
          ..write('entityId: $entityId, ')
          ..write('payload: $payload, ')
          ..write('retryCount: $retryCount, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $VocabularyTableTable vocabularyTable =
      $VocabularyTableTable(this);
  late final $SrsCardTableTable srsCardTable = $SrsCardTableTable(this);
  late final $SyncQueueTableTable syncQueueTable = $SyncQueueTableTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [vocabularyTable, srsCardTable, syncQueueTable];
}

typedef $$VocabularyTableTableCreateCompanionBuilder = VocabularyTableCompanion
    Function({
  Value<int> id,
  required int lessonNumber,
  required String kana,
  Value<String?> kanji,
  required String meaning,
  Value<String> romaji,
  required int sortOrder,
  Value<String> syncStatus,
  required int updatedAt,
  Value<String?> meaningEn,
  Value<String?> meaningEnSource,
  Value<String?> hanViet,
  Value<String?> furigana,
});
typedef $$VocabularyTableTableUpdateCompanionBuilder = VocabularyTableCompanion
    Function({
  Value<int> id,
  Value<int> lessonNumber,
  Value<String> kana,
  Value<String?> kanji,
  Value<String> meaning,
  Value<String> romaji,
  Value<int> sortOrder,
  Value<String> syncStatus,
  Value<int> updatedAt,
  Value<String?> meaningEn,
  Value<String?> meaningEnSource,
  Value<String?> hanViet,
  Value<String?> furigana,
});

final class $$VocabularyTableTableReferences extends BaseReferences<
    _$AppDatabase, $VocabularyTableTable, VocabularyTableData> {
  $$VocabularyTableTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$SrsCardTableTable, List<SrsCardTableData>>
      _srsCardTableRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.srsCardTable,
              aliasName: $_aliasNameGenerator(
                  db.vocabularyTable.id, db.srsCardTable.vocabularyId));

  $$SrsCardTableTableProcessedTableManager get srsCardTableRefs {
    final manager = $$SrsCardTableTableTableManager($_db, $_db.srsCardTable)
        .filter((f) => f.vocabularyId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_srsCardTableRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$VocabularyTableTableFilterComposer
    extends Composer<_$AppDatabase, $VocabularyTableTable> {
  $$VocabularyTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lessonNumber => $composableBuilder(
      column: $table.lessonNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kana => $composableBuilder(
      column: $table.kana, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kanji => $composableBuilder(
      column: $table.kanji, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get meaning => $composableBuilder(
      column: $table.meaning, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get romaji => $composableBuilder(
      column: $table.romaji, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get sortOrder => $composableBuilder(
      column: $table.sortOrder, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get meaningEn => $composableBuilder(
      column: $table.meaningEn, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get meaningEnSource => $composableBuilder(
      column: $table.meaningEnSource,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get hanViet => $composableBuilder(
      column: $table.hanViet, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get furigana => $composableBuilder(
      column: $table.furigana, builder: (column) => ColumnFilters(column));

  Expression<bool> srsCardTableRefs(
      Expression<bool> Function($$SrsCardTableTableFilterComposer f) f) {
    final $$SrsCardTableTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.srsCardTable,
        getReferencedColumn: (t) => t.vocabularyId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$SrsCardTableTableFilterComposer(
              $db: $db,
              $table: $db.srsCardTable,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$VocabularyTableTableOrderingComposer
    extends Composer<_$AppDatabase, $VocabularyTableTable> {
  $$VocabularyTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lessonNumber => $composableBuilder(
      column: $table.lessonNumber,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kana => $composableBuilder(
      column: $table.kana, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kanji => $composableBuilder(
      column: $table.kanji, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get meaning => $composableBuilder(
      column: $table.meaning, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get romaji => $composableBuilder(
      column: $table.romaji, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get sortOrder => $composableBuilder(
      column: $table.sortOrder, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get meaningEn => $composableBuilder(
      column: $table.meaningEn, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get meaningEnSource => $composableBuilder(
      column: $table.meaningEnSource,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get hanViet => $composableBuilder(
      column: $table.hanViet, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get furigana => $composableBuilder(
      column: $table.furigana, builder: (column) => ColumnOrderings(column));
}

class $$VocabularyTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $VocabularyTableTable> {
  $$VocabularyTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get lessonNumber => $composableBuilder(
      column: $table.lessonNumber, builder: (column) => column);

  GeneratedColumn<String> get kana =>
      $composableBuilder(column: $table.kana, builder: (column) => column);

  GeneratedColumn<String> get kanji =>
      $composableBuilder(column: $table.kanji, builder: (column) => column);

  GeneratedColumn<String> get meaning =>
      $composableBuilder(column: $table.meaning, builder: (column) => column);

  GeneratedColumn<String> get romaji =>
      $composableBuilder(column: $table.romaji, builder: (column) => column);

  GeneratedColumn<int> get sortOrder =>
      $composableBuilder(column: $table.sortOrder, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<String> get meaningEn =>
      $composableBuilder(column: $table.meaningEn, builder: (column) => column);

  GeneratedColumn<String> get meaningEnSource => $composableBuilder(
      column: $table.meaningEnSource, builder: (column) => column);

  GeneratedColumn<String> get hanViet =>
      $composableBuilder(column: $table.hanViet, builder: (column) => column);

  GeneratedColumn<String> get furigana =>
      $composableBuilder(column: $table.furigana, builder: (column) => column);

  Expression<T> srsCardTableRefs<T extends Object>(
      Expression<T> Function($$SrsCardTableTableAnnotationComposer a) f) {
    final $$SrsCardTableTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.srsCardTable,
        getReferencedColumn: (t) => t.vocabularyId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$SrsCardTableTableAnnotationComposer(
              $db: $db,
              $table: $db.srsCardTable,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$VocabularyTableTableTableManager extends RootTableManager<
    _$AppDatabase,
    $VocabularyTableTable,
    VocabularyTableData,
    $$VocabularyTableTableFilterComposer,
    $$VocabularyTableTableOrderingComposer,
    $$VocabularyTableTableAnnotationComposer,
    $$VocabularyTableTableCreateCompanionBuilder,
    $$VocabularyTableTableUpdateCompanionBuilder,
    (VocabularyTableData, $$VocabularyTableTableReferences),
    VocabularyTableData,
    PrefetchHooks Function({bool srsCardTableRefs})> {
  $$VocabularyTableTableTableManager(
      _$AppDatabase db, $VocabularyTableTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$VocabularyTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$VocabularyTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$VocabularyTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> lessonNumber = const Value.absent(),
            Value<String> kana = const Value.absent(),
            Value<String?> kanji = const Value.absent(),
            Value<String> meaning = const Value.absent(),
            Value<String> romaji = const Value.absent(),
            Value<int> sortOrder = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
            Value<String?> meaningEn = const Value.absent(),
            Value<String?> meaningEnSource = const Value.absent(),
            Value<String?> hanViet = const Value.absent(),
            Value<String?> furigana = const Value.absent(),
          }) =>
              VocabularyTableCompanion(
            id: id,
            lessonNumber: lessonNumber,
            kana: kana,
            kanji: kanji,
            meaning: meaning,
            romaji: romaji,
            sortOrder: sortOrder,
            syncStatus: syncStatus,
            updatedAt: updatedAt,
            meaningEn: meaningEn,
            meaningEnSource: meaningEnSource,
            hanViet: hanViet,
            furigana: furigana,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int lessonNumber,
            required String kana,
            Value<String?> kanji = const Value.absent(),
            required String meaning,
            Value<String> romaji = const Value.absent(),
            required int sortOrder,
            Value<String> syncStatus = const Value.absent(),
            required int updatedAt,
            Value<String?> meaningEn = const Value.absent(),
            Value<String?> meaningEnSource = const Value.absent(),
            Value<String?> hanViet = const Value.absent(),
            Value<String?> furigana = const Value.absent(),
          }) =>
              VocabularyTableCompanion.insert(
            id: id,
            lessonNumber: lessonNumber,
            kana: kana,
            kanji: kanji,
            meaning: meaning,
            romaji: romaji,
            sortOrder: sortOrder,
            syncStatus: syncStatus,
            updatedAt: updatedAt,
            meaningEn: meaningEn,
            meaningEnSource: meaningEnSource,
            hanViet: hanViet,
            furigana: furigana,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$VocabularyTableTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({srsCardTableRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (srsCardTableRefs) db.srsCardTable],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (srsCardTableRefs)
                    await $_getPrefetchedData<VocabularyTableData,
                            $VocabularyTableTable, SrsCardTableData>(
                        currentTable: table,
                        referencedTable: $$VocabularyTableTableReferences
                            ._srsCardTableRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$VocabularyTableTableReferences(db, table, p0)
                                .srsCardTableRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.vocabularyId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$VocabularyTableTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $VocabularyTableTable,
    VocabularyTableData,
    $$VocabularyTableTableFilterComposer,
    $$VocabularyTableTableOrderingComposer,
    $$VocabularyTableTableAnnotationComposer,
    $$VocabularyTableTableCreateCompanionBuilder,
    $$VocabularyTableTableUpdateCompanionBuilder,
    (VocabularyTableData, $$VocabularyTableTableReferences),
    VocabularyTableData,
    PrefetchHooks Function({bool srsCardTableRefs})>;
typedef $$SrsCardTableTableCreateCompanionBuilder = SrsCardTableCompanion
    Function({
  Value<int> id,
  required int vocabularyId,
  Value<double> easeFactor,
  Value<int> interval,
  Value<int> repetitions,
  required int nextReviewAt,
  Value<bool> mastered,
  Value<String> syncStatus,
  required int updatedAt,
});
typedef $$SrsCardTableTableUpdateCompanionBuilder = SrsCardTableCompanion
    Function({
  Value<int> id,
  Value<int> vocabularyId,
  Value<double> easeFactor,
  Value<int> interval,
  Value<int> repetitions,
  Value<int> nextReviewAt,
  Value<bool> mastered,
  Value<String> syncStatus,
  Value<int> updatedAt,
});

final class $$SrsCardTableTableReferences extends BaseReferences<_$AppDatabase,
    $SrsCardTableTable, SrsCardTableData> {
  $$SrsCardTableTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $VocabularyTableTable _vocabularyIdTable(_$AppDatabase db) =>
      db.vocabularyTable.createAlias($_aliasNameGenerator(
          db.srsCardTable.vocabularyId, db.vocabularyTable.id));

  $$VocabularyTableTableProcessedTableManager get vocabularyId {
    final $_column = $_itemColumn<int>('vocabulary_id')!;

    final manager =
        $$VocabularyTableTableTableManager($_db, $_db.vocabularyTable)
            .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_vocabularyIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$SrsCardTableTableFilterComposer
    extends Composer<_$AppDatabase, $SrsCardTableTable> {
  $$SrsCardTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get easeFactor => $composableBuilder(
      column: $table.easeFactor, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get interval => $composableBuilder(
      column: $table.interval, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get repetitions => $composableBuilder(
      column: $table.repetitions, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get nextReviewAt => $composableBuilder(
      column: $table.nextReviewAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get mastered => $composableBuilder(
      column: $table.mastered, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  $$VocabularyTableTableFilterComposer get vocabularyId {
    final $$VocabularyTableTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.vocabularyId,
        referencedTable: $db.vocabularyTable,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$VocabularyTableTableFilterComposer(
              $db: $db,
              $table: $db.vocabularyTable,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$SrsCardTableTableOrderingComposer
    extends Composer<_$AppDatabase, $SrsCardTableTable> {
  $$SrsCardTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get easeFactor => $composableBuilder(
      column: $table.easeFactor, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get interval => $composableBuilder(
      column: $table.interval, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get repetitions => $composableBuilder(
      column: $table.repetitions, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get nextReviewAt => $composableBuilder(
      column: $table.nextReviewAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get mastered => $composableBuilder(
      column: $table.mastered, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  $$VocabularyTableTableOrderingComposer get vocabularyId {
    final $$VocabularyTableTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.vocabularyId,
        referencedTable: $db.vocabularyTable,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$VocabularyTableTableOrderingComposer(
              $db: $db,
              $table: $db.vocabularyTable,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$SrsCardTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $SrsCardTableTable> {
  $$SrsCardTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<double> get easeFactor => $composableBuilder(
      column: $table.easeFactor, builder: (column) => column);

  GeneratedColumn<int> get interval =>
      $composableBuilder(column: $table.interval, builder: (column) => column);

  GeneratedColumn<int> get repetitions => $composableBuilder(
      column: $table.repetitions, builder: (column) => column);

  GeneratedColumn<int> get nextReviewAt => $composableBuilder(
      column: $table.nextReviewAt, builder: (column) => column);

  GeneratedColumn<bool> get mastered =>
      $composableBuilder(column: $table.mastered, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  $$VocabularyTableTableAnnotationComposer get vocabularyId {
    final $$VocabularyTableTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.vocabularyId,
        referencedTable: $db.vocabularyTable,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$VocabularyTableTableAnnotationComposer(
              $db: $db,
              $table: $db.vocabularyTable,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$SrsCardTableTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SrsCardTableTable,
    SrsCardTableData,
    $$SrsCardTableTableFilterComposer,
    $$SrsCardTableTableOrderingComposer,
    $$SrsCardTableTableAnnotationComposer,
    $$SrsCardTableTableCreateCompanionBuilder,
    $$SrsCardTableTableUpdateCompanionBuilder,
    (SrsCardTableData, $$SrsCardTableTableReferences),
    SrsCardTableData,
    PrefetchHooks Function({bool vocabularyId})> {
  $$SrsCardTableTableTableManager(_$AppDatabase db, $SrsCardTableTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SrsCardTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SrsCardTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SrsCardTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> vocabularyId = const Value.absent(),
            Value<double> easeFactor = const Value.absent(),
            Value<int> interval = const Value.absent(),
            Value<int> repetitions = const Value.absent(),
            Value<int> nextReviewAt = const Value.absent(),
            Value<bool> mastered = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
          }) =>
              SrsCardTableCompanion(
            id: id,
            vocabularyId: vocabularyId,
            easeFactor: easeFactor,
            interval: interval,
            repetitions: repetitions,
            nextReviewAt: nextReviewAt,
            mastered: mastered,
            syncStatus: syncStatus,
            updatedAt: updatedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int vocabularyId,
            Value<double> easeFactor = const Value.absent(),
            Value<int> interval = const Value.absent(),
            Value<int> repetitions = const Value.absent(),
            required int nextReviewAt,
            Value<bool> mastered = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            required int updatedAt,
          }) =>
              SrsCardTableCompanion.insert(
            id: id,
            vocabularyId: vocabularyId,
            easeFactor: easeFactor,
            interval: interval,
            repetitions: repetitions,
            nextReviewAt: nextReviewAt,
            mastered: mastered,
            syncStatus: syncStatus,
            updatedAt: updatedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$SrsCardTableTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({vocabularyId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (vocabularyId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.vocabularyId,
                    referencedTable:
                        $$SrsCardTableTableReferences._vocabularyIdTable(db),
                    referencedColumn:
                        $$SrsCardTableTableReferences._vocabularyIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$SrsCardTableTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SrsCardTableTable,
    SrsCardTableData,
    $$SrsCardTableTableFilterComposer,
    $$SrsCardTableTableOrderingComposer,
    $$SrsCardTableTableAnnotationComposer,
    $$SrsCardTableTableCreateCompanionBuilder,
    $$SrsCardTableTableUpdateCompanionBuilder,
    (SrsCardTableData, $$SrsCardTableTableReferences),
    SrsCardTableData,
    PrefetchHooks Function({bool vocabularyId})>;
typedef $$SyncQueueTableTableCreateCompanionBuilder = SyncQueueTableCompanion
    Function({
  Value<int> id,
  required String operation,
  required int entityId,
  required String payload,
  Value<int> retryCount,
  required int createdAt,
});
typedef $$SyncQueueTableTableUpdateCompanionBuilder = SyncQueueTableCompanion
    Function({
  Value<int> id,
  Value<String> operation,
  Value<int> entityId,
  Value<String> payload,
  Value<int> retryCount,
  Value<int> createdAt,
});

class $$SyncQueueTableTableFilterComposer
    extends Composer<_$AppDatabase, $SyncQueueTableTable> {
  $$SyncQueueTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get operation => $composableBuilder(
      column: $table.operation, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get entityId => $composableBuilder(
      column: $table.entityId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get payload => $composableBuilder(
      column: $table.payload, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));
}

class $$SyncQueueTableTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncQueueTableTable> {
  $$SyncQueueTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get operation => $composableBuilder(
      column: $table.operation, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get entityId => $composableBuilder(
      column: $table.entityId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get payload => $composableBuilder(
      column: $table.payload, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));
}

class $$SyncQueueTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncQueueTableTable> {
  $$SyncQueueTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operation =>
      $composableBuilder(column: $table.operation, builder: (column) => column);

  GeneratedColumn<int> get entityId =>
      $composableBuilder(column: $table.entityId, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$SyncQueueTableTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SyncQueueTableTable,
    SyncQueueTableData,
    $$SyncQueueTableTableFilterComposer,
    $$SyncQueueTableTableOrderingComposer,
    $$SyncQueueTableTableAnnotationComposer,
    $$SyncQueueTableTableCreateCompanionBuilder,
    $$SyncQueueTableTableUpdateCompanionBuilder,
    (
      SyncQueueTableData,
      BaseReferences<_$AppDatabase, $SyncQueueTableTable, SyncQueueTableData>
    ),
    SyncQueueTableData,
    PrefetchHooks Function()> {
  $$SyncQueueTableTableTableManager(
      _$AppDatabase db, $SyncQueueTableTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncQueueTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncQueueTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncQueueTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> operation = const Value.absent(),
            Value<int> entityId = const Value.absent(),
            Value<String> payload = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
          }) =>
              SyncQueueTableCompanion(
            id: id,
            operation: operation,
            entityId: entityId,
            payload: payload,
            retryCount: retryCount,
            createdAt: createdAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String operation,
            required int entityId,
            required String payload,
            Value<int> retryCount = const Value.absent(),
            required int createdAt,
          }) =>
              SyncQueueTableCompanion.insert(
            id: id,
            operation: operation,
            entityId: entityId,
            payload: payload,
            retryCount: retryCount,
            createdAt: createdAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SyncQueueTableTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SyncQueueTableTable,
    SyncQueueTableData,
    $$SyncQueueTableTableFilterComposer,
    $$SyncQueueTableTableOrderingComposer,
    $$SyncQueueTableTableAnnotationComposer,
    $$SyncQueueTableTableCreateCompanionBuilder,
    $$SyncQueueTableTableUpdateCompanionBuilder,
    (
      SyncQueueTableData,
      BaseReferences<_$AppDatabase, $SyncQueueTableTable, SyncQueueTableData>
    ),
    SyncQueueTableData,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$VocabularyTableTableTableManager get vocabularyTable =>
      $$VocabularyTableTableTableManager(_db, _db.vocabularyTable);
  $$SrsCardTableTableTableManager get srsCardTable =>
      $$SrsCardTableTableTableManager(_db, _db.srsCardTable);
  $$SyncQueueTableTableTableManager get syncQueueTable =>
      $$SyncQueueTableTableTableManager(_db, _db.syncQueueTable);
}
