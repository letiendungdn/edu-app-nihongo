--
-- PostgreSQL database dump
--

\restrict 7CPvBn7mnbAVWwJjfChMd6J4364JhOzLmoLA4KmRJwrPb93EUjtQqqtgGK0qXh6

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: flyway; Type: SCHEMA; Schema: -; Owner: nihongo
--

CREATE SCHEMA flyway;


ALTER SCHEMA flyway OWNER TO nihongo;

--
-- Name: insights; Type: SCHEMA; Schema: -; Owner: nihongo
--

CREATE SCHEMA insights;


ALTER SCHEMA insights OWNER TO nihongo;

--
-- Name: ContentType; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."ContentType" AS ENUM (
    'VOCABULARY',
    'GRAMMAR',
    'KANJI'
);


ALTER TYPE public."ContentType" OWNER TO nihongo;

--
-- Name: ExerciseType; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."ExerciseType" AS ENUM (
    'MULTIPLE_CHOICE',
    'FILL_IN_BLANK',
    'LISTENING'
);


ALTER TYPE public."ExerciseType" OWNER TO nihongo;

--
-- Name: JlptLevel; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."JlptLevel" AS ENUM (
    'N5',
    'N4',
    'N3',
    'N2',
    'N1'
);


ALTER TYPE public."JlptLevel" OWNER TO nihongo;

--
-- Name: JlptSessionStatus; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."JlptSessionStatus" AS ENUM (
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'UPCOMING',
    'PAST'
);


ALTER TYPE public."JlptSessionStatus" OWNER TO nihongo;

--
-- Name: KanaScript; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."KanaScript" AS ENUM (
    'HIRAGANA',
    'KATAKANA'
);


ALTER TYPE public."KanaScript" OWNER TO nihongo;

--
-- Name: LearnerChatMemberRole; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."LearnerChatMemberRole" AS ENUM (
    'MEMBER',
    'ADMIN'
);


ALTER TYPE public."LearnerChatMemberRole" OWNER TO nihongo;

--
-- Name: LearnerChatRoomType; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."LearnerChatRoomType" AS ENUM (
    'DIRECT',
    'GROUP'
);


ALTER TYPE public."LearnerChatRoomType" OWNER TO nihongo;

--
-- Name: MindMapKind; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."MindMapKind" AS ENUM (
    'GRAMMAR',
    'VOCAB',
    'KANJI'
);


ALTER TYPE public."MindMapKind" OWNER TO nihongo;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."NotificationType" AS ENUM (
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'SESSION_CONFIRMED',
    'SESSION_CANCELED',
    'SESSION_REMINDER',
    'COACH_MESSAGE',
    'SYSTEM',
    'SUPPORT_MESSAGE',
    'GROUP_MESSAGE'
);


ALTER TYPE public."NotificationType" OWNER TO nihongo;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO nihongo;

--
-- Name: PayoutStatus; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."PayoutStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'PAID',
    'FAILED'
);


ALTER TYPE public."PayoutStatus" OWNER TO nihongo;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN',
    'TEACHER'
);


ALTER TYPE public."Role" OWNER TO nihongo;

--
-- Name: SessionStatus; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."SessionStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELED',
    'NO_SHOW'
);


ALTER TYPE public."SessionStatus" OWNER TO nihongo;

--
-- Name: SubscriptionPlan; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."SubscriptionPlan" AS ENUM (
    'FREE',
    'BASIC',
    'PRO',
    'PRO_ANNUAL'
);


ALTER TYPE public."SubscriptionPlan" OWNER TO nihongo;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'PAST_DUE',
    'CANCELED',
    'TRIALING',
    'PAUSED'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO nihongo;

--
-- Name: Textbook; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."Textbook" AS ENUM (
    'MINNA',
    'KLL',
    'SOUMATOME',
    'SHINKANZEN',
    'TRY'
);


ALTER TYPE public."Textbook" OWNER TO nihongo;

--
-- Name: WebhookEventStatus; Type: TYPE; Schema: public; Owner: nihongo
--

CREATE TYPE public."WebhookEventStatus" AS ENUM (
    'RECEIVED',
    'PROCESSED',
    'FAILED',
    'IGNORED'
);


ALTER TYPE public."WebhookEventStatus" OWNER TO nihongo;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: flyway; Owner: nihongo
--

CREATE TABLE flyway.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE flyway.flyway_schema_history OWNER TO nihongo;

--
-- Name: churn_risk; Type: TABLE; Schema: insights; Owner: nihongo
--

CREATE TABLE insights.churn_risk (
    day date NOT NULL,
    user_id integer NOT NULL,
    risk_score integer NOT NULL,
    days_inactive integer NOT NULL,
    active_days_prior integer NOT NULL,
    due_cards integer DEFAULT 0 NOT NULL,
    last_active_day date NOT NULL,
    reasons text[] DEFAULT '{}'::text[] NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT churn_risk_risk_score_check CHECK (((risk_score >= 0) AND (risk_score <= 100)))
);


ALTER TABLE insights.churn_risk OWNER TO nihongo;

--
-- Name: daily_kpi; Type: TABLE; Schema: insights; Owner: nihongo
--

CREATE TABLE insights.daily_kpi (
    day date NOT NULL,
    active_learners integer NOT NULL,
    new_learners integer NOT NULL,
    at_risk integer NOT NULL,
    total_seconds bigint NOT NULL,
    cards_reviewed bigint NOT NULL,
    exams_taken integer NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE insights.daily_kpi OWNER TO nihongo;

--
-- Name: learner_day; Type: TABLE; Schema: insights; Owner: nihongo
--

CREATE TABLE insights.learner_day (
    day date NOT NULL,
    user_id integer NOT NULL,
    seconds integer DEFAULT 0 NOT NULL,
    cards_reviewed integer DEFAULT 0 NOT NULL,
    vocab_count integer DEFAULT 0 NOT NULL,
    kanji_count integer DEFAULT 0 NOT NULL,
    exams_taken integer DEFAULT 0 NOT NULL,
    exam_avg_percent numeric(5,2),
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT learner_day_cards_reviewed_check CHECK ((cards_reviewed >= 0)),
    CONSTRAINT learner_day_exams_taken_check CHECK ((exams_taken >= 0)),
    CONSTRAINT learner_day_kanji_count_check CHECK ((kanji_count >= 0)),
    CONSTRAINT learner_day_seconds_check CHECK ((seconds >= 0)),
    CONSTRAINT learner_day_vocab_count_check CHECK ((vocab_count >= 0))
);


ALTER TABLE insights.learner_day OWNER TO nihongo;

--
-- Name: reengagement; Type: TABLE; Schema: insights; Owner: nihongo
--

CREATE TABLE insights.reengagement (
    user_id integer NOT NULL,
    day date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    claimed_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT reengagement_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'skipped'::text])))
);


ALTER TABLE insights.reengagement OWNER TO nihongo;

--
-- Name: BookAudioDriveFolder; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."BookAudioDriveFolder" (
    id integer NOT NULL,
    "driveId" text NOT NULL,
    title text,
    "localPath" text,
    "fileCount" integer DEFAULT 0 NOT NULL,
    "downloadedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BookAudioDriveFolder" OWNER TO nihongo;

--
-- Name: BookAudioDriveFolder_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."BookAudioDriveFolder_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."BookAudioDriveFolder_id_seq" OWNER TO nihongo;

--
-- Name: BookAudioDriveFolder_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."BookAudioDriveFolder_id_seq" OWNED BY public."BookAudioDriveFolder".id;


--
-- Name: BookAudioFile; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."BookAudioFile" (
    id integer NOT NULL,
    "folderId" integer,
    "itemId" integer,
    "driveFileId" text,
    "fileName" text NOT NULL,
    "localPath" text NOT NULL,
    "mimeType" text,
    "sizeBytes" integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BookAudioFile" OWNER TO nihongo;

--
-- Name: BookAudioFile_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."BookAudioFile_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."BookAudioFile_id_seq" OWNER TO nihongo;

--
-- Name: BookAudioFile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."BookAudioFile_id_seq" OWNED BY public."BookAudioFile".id;


--
-- Name: BookAudioItem; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."BookAudioItem" (
    id integer NOT NULL,
    "externalKey" text NOT NULL,
    level text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    note text,
    "listNo" integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "driveId" text,
    "driveKind" text,
    "folderId" integer
);


ALTER TABLE public."BookAudioItem" OWNER TO nihongo;

--
-- Name: BookAudioItem_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."BookAudioItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."BookAudioItem_id_seq" OWNER TO nihongo;

--
-- Name: BookAudioItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."BookAudioItem_id_seq" OWNED BY public."BookAudioItem".id;


--
-- Name: BookAudioMeta; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."BookAudioMeta" (
    id integer DEFAULT 1 NOT NULL,
    "sourceUrl" text NOT NULL,
    publisher text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BookAudioMeta" OWNER TO nihongo;

--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ChatMessage" (
    id integer NOT NULL,
    "sessionId" integer NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fileUrl" text,
    "fileType" text
);


ALTER TABLE public."ChatMessage" OWNER TO nihongo;

--
-- Name: ChatMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ChatMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ChatMessage_id_seq" OWNER TO nihongo;

--
-- Name: ChatMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ChatMessage_id_seq" OWNED BY public."ChatMessage".id;


--
-- Name: CoachAvailability; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CoachAvailability" (
    id integer NOT NULL,
    "coachId" integer NOT NULL,
    "dayOfWeek" integer NOT NULL,
    "startHour" integer NOT NULL,
    "startMinute" integer DEFAULT 0 NOT NULL,
    "endHour" integer NOT NULL,
    "endMinute" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."CoachAvailability" OWNER TO nihongo;

--
-- Name: CoachAvailability_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."CoachAvailability_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CoachAvailability_id_seq" OWNER TO nihongo;

--
-- Name: CoachAvailability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."CoachAvailability_id_seq" OWNED BY public."CoachAvailability".id;


--
-- Name: CoachProfile; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CoachProfile" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    bio text,
    languages text[],
    specializations text[],
    "hourlyRateUsd" integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    timezone text DEFAULT 'Asia/Ho_Chi_Minh'::text NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "featuredUntil" timestamp(3) without time zone,
    "totalSessions" integer DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "reviewCount" integer DEFAULT 0 NOT NULL,
    "stripeAccountId" text,
    "payoutEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CoachProfile" OWNER TO nihongo;

--
-- Name: CoachProfile_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."CoachProfile_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CoachProfile_id_seq" OWNER TO nihongo;

--
-- Name: CoachProfile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."CoachProfile_id_seq" OWNED BY public."CoachProfile".id;


--
-- Name: CoachReview; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CoachReview" (
    id integer NOT NULL,
    "sessionId" integer NOT NULL,
    "learnerId" integer NOT NULL,
    "coachId" integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CoachReview" OWNER TO nihongo;

--
-- Name: CoachReview_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."CoachReview_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CoachReview_id_seq" OWNER TO nihongo;

--
-- Name: CoachReview_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."CoachReview_id_seq" OWNED BY public."CoachReview".id;


--
-- Name: CoachingSession; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CoachingSession" (
    id integer NOT NULL,
    "learnerId" integer NOT NULL,
    "coachId" integer NOT NULL,
    status public."SessionStatus" DEFAULT 'PENDING'::public."SessionStatus" NOT NULL,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    "durationMin" integer DEFAULT 60 NOT NULL,
    topic text,
    notes text,
    "priceUsdCents" integer NOT NULL,
    "platformFeePercent" integer DEFAULT 20 NOT NULL,
    "canceledAt" timestamp(3) without time zone,
    "canceledBy" text,
    "cancelReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "payoutId" integer
);


ALTER TABLE public."CoachingSession" OWNER TO nihongo;

--
-- Name: CoachingSession_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."CoachingSession_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CoachingSession_id_seq" OWNER TO nihongo;

--
-- Name: CoachingSession_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."CoachingSession_id_seq" OWNED BY public."CoachingSession".id;


--
-- Name: ConversationIntroExample; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ConversationIntroExample" (
    id integer NOT NULL,
    "slotId" integer NOT NULL,
    ja text NOT NULL,
    kana text NOT NULL,
    romaji text NOT NULL,
    vi text NOT NULL,
    note text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ConversationIntroExample" OWNER TO nihongo;

--
-- Name: ConversationIntroExample_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ConversationIntroExample_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ConversationIntroExample_id_seq" OWNER TO nihongo;

--
-- Name: ConversationIntroExample_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ConversationIntroExample_id_seq" OWNED BY public."ConversationIntroExample".id;


--
-- Name: ConversationIntroLine; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ConversationIntroLine" (
    id integer NOT NULL,
    ja text NOT NULL,
    kana text NOT NULL,
    romaji text NOT NULL,
    vi text NOT NULL,
    tip text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ConversationIntroLine" OWNER TO nihongo;

--
-- Name: ConversationIntroLine_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ConversationIntroLine_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ConversationIntroLine_id_seq" OWNER TO nihongo;

--
-- Name: ConversationIntroLine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ConversationIntroLine_id_seq" OWNED BY public."ConversationIntroLine".id;


--
-- Name: ConversationIntroSlot; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ConversationIntroSlot" (
    id integer NOT NULL,
    slot text NOT NULL,
    question text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ConversationIntroSlot" OWNER TO nihongo;

--
-- Name: ConversationIntroSlot_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ConversationIntroSlot_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ConversationIntroSlot_id_seq" OWNER TO nihongo;

--
-- Name: ConversationIntroSlot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ConversationIntroSlot_id_seq" OWNED BY public."ConversationIntroSlot".id;


--
-- Name: ConversationPhraseGroup; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ConversationPhraseGroup" (
    id integer NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    hint text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ConversationPhraseGroup" OWNER TO nihongo;

--
-- Name: ConversationPhraseGroup_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ConversationPhraseGroup_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ConversationPhraseGroup_id_seq" OWNER TO nihongo;

--
-- Name: ConversationPhraseGroup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ConversationPhraseGroup_id_seq" OWNED BY public."ConversationPhraseGroup".id;


--
-- Name: ConversationPhraseItem; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ConversationPhraseItem" (
    id integer NOT NULL,
    "groupId" integer NOT NULL,
    ja text NOT NULL,
    kana text NOT NULL,
    romaji text NOT NULL,
    vi text NOT NULL,
    note text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ConversationPhraseItem" OWNER TO nihongo;

--
-- Name: ConversationPhraseItem_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ConversationPhraseItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ConversationPhraseItem_id_seq" OWNER TO nihongo;

--
-- Name: ConversationPhraseItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ConversationPhraseItem_id_seq" OWNED BY public."ConversationPhraseItem".id;


--
-- Name: CounterCategory; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CounterCategory" (
    id integer NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    hint text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CounterCategory" OWNER TO nihongo;

--
-- Name: CounterCategory_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."CounterCategory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CounterCategory_id_seq" OWNER TO nihongo;

--
-- Name: CounterCategory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."CounterCategory_id_seq" OWNED BY public."CounterCategory".id;


--
-- Name: CounterItem; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CounterItem" (
    id integer NOT NULL,
    "categoryId" integer NOT NULL,
    "displayNumber" text NOT NULL,
    kanji text,
    kana text NOT NULL,
    romaji text NOT NULL,
    "meaningVi" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."CounterItem" OWNER TO nihongo;

--
-- Name: CounterItem_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."CounterItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CounterItem_id_seq" OWNER TO nihongo;

--
-- Name: CounterItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."CounterItem_id_seq" OWNED BY public."CounterItem".id;


--
-- Name: CountryNameItem; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CountryNameItem" (
    id integer NOT NULL,
    "regionId" integer NOT NULL,
    "nameJa" text NOT NULL,
    kana text NOT NULL,
    romaji text NOT NULL,
    "meaningVi" text NOT NULL,
    "countryCode" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."CountryNameItem" OWNER TO nihongo;

--
-- Name: CountryNameItem_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."CountryNameItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CountryNameItem_id_seq" OWNER TO nihongo;

--
-- Name: CountryNameItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."CountryNameItem_id_seq" OWNED BY public."CountryNameItem".id;


--
-- Name: CountryRegion; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CountryRegion" (
    id integer NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CountryRegion" OWNER TO nihongo;

--
-- Name: CountryRegion_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."CountryRegion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CountryRegion_id_seq" OWNER TO nihongo;

--
-- Name: CountryRegion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."CountryRegion_id_seq" OWNED BY public."CountryRegion".id;


--
-- Name: CronRun; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."CronRun" (
    name text NOT NULL,
    slot text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CronRun" OWNER TO nihongo;

--
-- Name: DailyActivity; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."DailyActivity" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    date text NOT NULL,
    kind text NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DailyActivity" OWNER TO nihongo;

--
-- Name: DailyActivity_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."DailyActivity_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DailyActivity_id_seq" OWNER TO nihongo;

--
-- Name: DailyActivity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."DailyActivity_id_seq" OWNED BY public."DailyActivity".id;


--
-- Name: DailyGoal; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."DailyGoal" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    date text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DailyGoal" OWNER TO nihongo;

--
-- Name: DailyGoalItem; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."DailyGoalItem" (
    id integer NOT NULL,
    "goalId" integer NOT NULL,
    text text NOT NULL,
    done boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."DailyGoalItem" OWNER TO nihongo;

--
-- Name: DailyGoalItem_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."DailyGoalItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DailyGoalItem_id_seq" OWNER TO nihongo;

--
-- Name: DailyGoalItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."DailyGoalItem_id_seq" OWNED BY public."DailyGoalItem".id;


--
-- Name: DailyGoal_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."DailyGoal_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DailyGoal_id_seq" OWNER TO nihongo;

--
-- Name: DailyGoal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."DailyGoal_id_seq" OWNED BY public."DailyGoal".id;


--
-- Name: DailyNote; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."DailyNote" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    date text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DailyNote" OWNER TO nihongo;

--
-- Name: DailyNote_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."DailyNote_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DailyNote_id_seq" OWNER TO nihongo;

--
-- Name: DailyNote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."DailyNote_id_seq" OWNED BY public."DailyNote".id;


--
-- Name: DictationAttempt; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."DictationAttempt" (
    id integer NOT NULL,
    "userId" integer,
    "vocabId" integer NOT NULL,
    "userInput" text NOT NULL,
    correct boolean NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DictationAttempt" OWNER TO nihongo;

--
-- Name: DictationAttempt_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."DictationAttempt_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DictationAttempt_id_seq" OWNER TO nihongo;

--
-- Name: DictationAttempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."DictationAttempt_id_seq" OWNED BY public."DictationAttempt".id;


--
-- Name: EmailBroadcast; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EmailBroadcast" (
    id text NOT NULL,
    type text DEFAULT 'template'::text NOT NULL,
    "templateName" text,
    subject text NOT NULL,
    filter jsonb DEFAULT '{}'::jsonb NOT NULL,
    "totalCount" integer DEFAULT 0 NOT NULL,
    "sentCount" integer DEFAULT 0 NOT NULL,
    "failedCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdById" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EmailBroadcast" OWNER TO nihongo;

--
-- Name: EmailPrefs; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EmailPrefs" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "receiveProgress" boolean DEFAULT true NOT NULL,
    "receiveStreak" boolean DEFAULT true NOT NULL,
    "lastMilestoneNotified" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmailPrefs" OWNER TO nihongo;

--
-- Name: EmailPrefs_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."EmailPrefs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EmailPrefs_id_seq" OWNER TO nihongo;

--
-- Name: EmailPrefs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."EmailPrefs_id_seq" OWNED BY public."EmailPrefs".id;


--
-- Name: EmailTemplate; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EmailTemplate" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    subject text NOT NULL,
    "htmlBody" text NOT NULL,
    "textBody" text NOT NULL,
    variables text[],
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "updatedById" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmailTemplate" OWNER TO nihongo;

--
-- Name: EmailTemplate_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."EmailTemplate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EmailTemplate_id_seq" OWNER TO nihongo;

--
-- Name: EmailTemplate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."EmailTemplate_id_seq" OWNED BY public."EmailTemplate".id;


--
-- Name: EmailVerificationToken; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EmailVerificationToken" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "userId" integer NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EmailVerificationToken" OWNER TO nihongo;

--
-- Name: EnglishKatakanaExample; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EnglishKatakanaExample" (
    id integer NOT NULL,
    "sectionId" integer NOT NULL,
    english text NOT NULL,
    katakana text NOT NULL,
    romaji text NOT NULL,
    "meaningVi" text NOT NULL,
    note text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."EnglishKatakanaExample" OWNER TO nihongo;

--
-- Name: EnglishKatakanaExample_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."EnglishKatakanaExample_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EnglishKatakanaExample_id_seq" OWNER TO nihongo;

--
-- Name: EnglishKatakanaExample_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."EnglishKatakanaExample_id_seq" OWNED BY public."EnglishKatakanaExample".id;


--
-- Name: EnglishKatakanaMapping; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EnglishKatakanaMapping" (
    id integer NOT NULL,
    "sectionId" integer NOT NULL,
    english text NOT NULL,
    katakana text NOT NULL,
    romaji text NOT NULL,
    note text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."EnglishKatakanaMapping" OWNER TO nihongo;

--
-- Name: EnglishKatakanaMapping_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."EnglishKatakanaMapping_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EnglishKatakanaMapping_id_seq" OWNER TO nihongo;

--
-- Name: EnglishKatakanaMapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."EnglishKatakanaMapping_id_seq" OWNED BY public."EnglishKatakanaMapping".id;


--
-- Name: EnglishKatakanaMeta; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EnglishKatakanaMeta" (
    id integer DEFAULT 1 NOT NULL,
    intro text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EnglishKatakanaMeta" OWNER TO nihongo;

--
-- Name: EnglishKatakanaPoint; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EnglishKatakanaPoint" (
    id integer NOT NULL,
    "sectionId" integer NOT NULL,
    explanation text NOT NULL,
    english text,
    katakana text,
    romaji text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."EnglishKatakanaPoint" OWNER TO nihongo;

--
-- Name: EnglishKatakanaPoint_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."EnglishKatakanaPoint_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EnglishKatakanaPoint_id_seq" OWNER TO nihongo;

--
-- Name: EnglishKatakanaPoint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."EnglishKatakanaPoint_id_seq" OWNED BY public."EnglishKatakanaPoint".id;


--
-- Name: EnglishKatakanaSection; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EnglishKatakanaSection" (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EnglishKatakanaSection" OWNER TO nihongo;

--
-- Name: EnglishKatakanaSection_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."EnglishKatakanaSection_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EnglishKatakanaSection_id_seq" OWNER TO nihongo;

--
-- Name: EnglishKatakanaSection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."EnglishKatakanaSection_id_seq" OWNED BY public."EnglishKatakanaSection".id;


--
-- Name: EnglishKatakanaTip; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."EnglishKatakanaTip" (
    id integer NOT NULL,
    text text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EnglishKatakanaTip" OWNER TO nihongo;

--
-- Name: EnglishKatakanaTip_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."EnglishKatakanaTip_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EnglishKatakanaTip_id_seq" OWNER TO nihongo;

--
-- Name: EnglishKatakanaTip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."EnglishKatakanaTip_id_seq" OWNED BY public."EnglishKatakanaTip".id;


--
-- Name: ExamResult; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ExamResult" (
    id integer NOT NULL,
    "userId" integer,
    "examId" text NOT NULL,
    level text NOT NULL,
    title text NOT NULL,
    "correctCount" integer NOT NULL,
    total integer NOT NULL,
    percent double precision NOT NULL,
    passed boolean NOT NULL,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ExamResult" OWNER TO nihongo;

--
-- Name: ExamResult_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ExamResult_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ExamResult_id_seq" OWNER TO nihongo;

--
-- Name: ExamResult_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ExamResult_id_seq" OWNED BY public."ExamResult".id;


--
-- Name: ExamSectionResult; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ExamSectionResult" (
    id integer NOT NULL,
    "examResultId" integer NOT NULL,
    section text NOT NULL,
    correct integer NOT NULL,
    total integer NOT NULL,
    percent double precision NOT NULL
);


ALTER TABLE public."ExamSectionResult" OWNER TO nihongo;

--
-- Name: ExamSectionResult_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ExamSectionResult_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ExamSectionResult_id_seq" OWNER TO nihongo;

--
-- Name: ExamSectionResult_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ExamSectionResult_id_seq" OWNED BY public."ExamSectionResult".id;


--
-- Name: Example; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Example" (
    id integer NOT NULL,
    jp text NOT NULL,
    romaji text NOT NULL,
    en text,
    vi text,
    "grammarId" integer NOT NULL,
    "audioUrl" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Example" OWNER TO nihongo;

--
-- Name: Example_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Example_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Example_id_seq" OWNER TO nihongo;

--
-- Name: Example_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Example_id_seq" OWNED BY public."Example".id;


--
-- Name: Exercise; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Exercise" (
    id integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    "lessonId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type public."ExerciseType" NOT NULL,
    explanation text,
    "audioUrl" text,
    difficulty integer DEFAULT 1 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Exercise" OWNER TO nihongo;

--
-- Name: ExerciseOption; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ExerciseOption" (
    id integer NOT NULL,
    "exerciseId" integer NOT NULL,
    text text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isCorrect" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."ExerciseOption" OWNER TO nihongo;

--
-- Name: ExerciseOption_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ExerciseOption_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ExerciseOption_id_seq" OWNER TO nihongo;

--
-- Name: ExerciseOption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ExerciseOption_id_seq" OWNED BY public."ExerciseOption".id;


--
-- Name: Exercise_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Exercise_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Exercise_id_seq" OWNER TO nihongo;

--
-- Name: Exercise_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Exercise_id_seq" OWNED BY public."Exercise".id;


--
-- Name: FeatureFlag; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."FeatureFlag" (
    key text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    roles public."Role"[],
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FeatureFlag" OWNER TO nihongo;

--
-- Name: Grammar; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Grammar" (
    id integer NOT NULL,
    pattern text NOT NULL,
    meaning text NOT NULL,
    explanation text,
    "lessonId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "jlptLevel" public."JlptLevel",
    "formalityLevel" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Grammar" OWNER TO nihongo;

--
-- Name: Grammar_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Grammar_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Grammar_id_seq" OWNER TO nihongo;

--
-- Name: Grammar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Grammar_id_seq" OWNED BY public."Grammar".id;


--
-- Name: HomeFeatureItem; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."HomeFeatureItem" (
    id integer NOT NULL,
    "sectionId" integer NOT NULL,
    href text NOT NULL,
    icon text NOT NULL,
    title text NOT NULL,
    "desc" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HomeFeatureItem" OWNER TO nihongo;

--
-- Name: HomeFeatureItem_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."HomeFeatureItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."HomeFeatureItem_id_seq" OWNER TO nihongo;

--
-- Name: HomeFeatureItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."HomeFeatureItem_id_seq" OWNED BY public."HomeFeatureItem".id;


--
-- Name: HomeFeatureSection; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."HomeFeatureSection" (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HomeFeatureSection" OWNER TO nihongo;

--
-- Name: HomeFeatureSection_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."HomeFeatureSection_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."HomeFeatureSection_id_seq" OWNER TO nihongo;

--
-- Name: HomeFeatureSection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."HomeFeatureSection_id_seq" OWNED BY public."HomeFeatureSection".id;


--
-- Name: HomeStat; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."HomeStat" (
    id integer NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    suffix text DEFAULT ''::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HomeStat" OWNER TO nihongo;

--
-- Name: HomeStat_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."HomeStat_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."HomeStat_id_seq" OWNER TO nihongo;

--
-- Name: HomeStat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."HomeStat_id_seq" OWNED BY public."HomeStat".id;


--
-- Name: JlptExamBriefing; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptExamBriefing" (
    id integer DEFAULT 1 NOT NULL,
    text text NOT NULL
);


ALTER TABLE public."JlptExamBriefing" OWNER TO nihongo;

--
-- Name: JlptExamDaySlot; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptExamDaySlot" (
    id integer NOT NULL,
    levels text NOT NULL,
    "arriveAt" text NOT NULL,
    "startAt" text NOT NULL,
    venue text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JlptExamDaySlot" OWNER TO nihongo;

--
-- Name: JlptExamDaySlot_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."JlptExamDaySlot_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JlptExamDaySlot_id_seq" OWNER TO nihongo;

--
-- Name: JlptExamDaySlot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."JlptExamDaySlot_id_seq" OWNED BY public."JlptExamDaySlot".id;


--
-- Name: JlptExamFeeInfo; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptExamFeeInfo" (
    id integer DEFAULT 1 NOT NULL,
    "formFee" text NOT NULL,
    "examFee" text NOT NULL,
    note text NOT NULL
);


ALTER TABLE public."JlptExamFeeInfo" OWNER TO nihongo;

--
-- Name: JlptExamSession; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptExamSession" (
    id integer NOT NULL,
    "externalKey" text NOT NULL,
    label text NOT NULL,
    "examDate" text NOT NULL,
    "registrationPeriod" text NOT NULL,
    status public."JlptSessionStatus" NOT NULL,
    "statusLabel" text NOT NULL,
    "announcementUrl" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JlptExamSession" OWNER TO nihongo;

--
-- Name: JlptExamSession_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."JlptExamSession_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JlptExamSession_id_seq" OWNER TO nihongo;

--
-- Name: JlptExamSession_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."JlptExamSession_id_seq" OWNED BY public."JlptExamSession".id;


--
-- Name: JlptExamVenue; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptExamVenue" (
    id integer NOT NULL,
    address text NOT NULL,
    district text NOT NULL,
    levels text NOT NULL,
    note text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JlptExamVenue" OWNER TO nihongo;

--
-- Name: JlptExamVenue_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."JlptExamVenue_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JlptExamVenue_id_seq" OWNER TO nihongo;

--
-- Name: JlptExamVenue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."JlptExamVenue_id_seq" OWNED BY public."JlptExamVenue".id;


--
-- Name: JlptOrganizer; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptOrganizer" (
    id integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    "shortName" text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    website text NOT NULL,
    "announcementsUrl" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JlptOrganizer" OWNER TO nihongo;

--
-- Name: JlptRoadmapExamSection; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptRoadmapExamSection" (
    id integer NOT NULL,
    "levelId" integer NOT NULL,
    name text NOT NULL,
    points integer NOT NULL,
    "time" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."JlptRoadmapExamSection" OWNER TO nihongo;

--
-- Name: JlptRoadmapExamSection_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."JlptRoadmapExamSection_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JlptRoadmapExamSection_id_seq" OWNER TO nihongo;

--
-- Name: JlptRoadmapExamSection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."JlptRoadmapExamSection_id_seq" OWNED BY public."JlptRoadmapExamSection".id;


--
-- Name: JlptRoadmapLevel; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptRoadmapLevel" (
    id integer NOT NULL,
    "externalKey" text NOT NULL,
    label text NOT NULL,
    badge text NOT NULL,
    color text NOT NULL,
    duration text NOT NULL,
    "vocabTarget" text NOT NULL,
    "kanjiTarget" text NOT NULL,
    "passScore" text NOT NULL,
    summary text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "grammarTarget" text DEFAULT ''::text NOT NULL,
    "vocabIncrement" text DEFAULT ''::text NOT NULL,
    "kanjiIncrement" text DEFAULT ''::text NOT NULL,
    "grammarIncrement" text DEFAULT ''::text NOT NULL
);


ALTER TABLE public."JlptRoadmapLevel" OWNER TO nihongo;

--
-- Name: JlptRoadmapLevel_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."JlptRoadmapLevel_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JlptRoadmapLevel_id_seq" OWNER TO nihongo;

--
-- Name: JlptRoadmapLevel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."JlptRoadmapLevel_id_seq" OWNED BY public."JlptRoadmapLevel".id;


--
-- Name: JlptRoadmapMaterial; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptRoadmapMaterial" (
    id integer NOT NULL,
    "levelId" integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    scope text NOT NULL,
    "inAppPath" text,
    "inAppLabel" text,
    "externalUrl" text,
    "externalLabel" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."JlptRoadmapMaterial" OWNER TO nihongo;

--
-- Name: JlptRoadmapMaterial_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."JlptRoadmapMaterial_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JlptRoadmapMaterial_id_seq" OWNER TO nihongo;

--
-- Name: JlptRoadmapMaterial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."JlptRoadmapMaterial_id_seq" OWNED BY public."JlptRoadmapMaterial".id;


--
-- Name: JlptRoadmapMeta; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptRoadmapMeta" (
    id integer DEFAULT 1 NOT NULL,
    "examScheduleNote" text NOT NULL
);


ALTER TABLE public."JlptRoadmapMeta" OWNER TO nihongo;

--
-- Name: JlptRoadmapPhase; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptRoadmapPhase" (
    id integer NOT NULL,
    "levelId" integer NOT NULL,
    "externalKey" text NOT NULL,
    title text NOT NULL,
    subtitle text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."JlptRoadmapPhase" OWNER TO nihongo;

--
-- Name: JlptRoadmapPhase_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."JlptRoadmapPhase_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JlptRoadmapPhase_id_seq" OWNER TO nihongo;

--
-- Name: JlptRoadmapPhase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."JlptRoadmapPhase_id_seq" OWNED BY public."JlptRoadmapPhase".id;


--
-- Name: JlptRoadmapTask; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."JlptRoadmapTask" (
    id integer NOT NULL,
    "phaseId" integer NOT NULL,
    "externalKey" text NOT NULL,
    text text NOT NULL,
    "inAppPath" text,
    "inAppLabel" text,
    "externalUrl" text,
    "externalLabel" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."JlptRoadmapTask" OWNER TO nihongo;

--
-- Name: JlptRoadmapTask_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."JlptRoadmapTask_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."JlptRoadmapTask_id_seq" OWNER TO nihongo;

--
-- Name: JlptRoadmapTask_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."JlptRoadmapTask_id_seq" OWNED BY public."JlptRoadmapTask".id;


--
-- Name: KanaCell; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."KanaCell" (
    id integer NOT NULL,
    "sectionId" integer NOT NULL,
    "rowIndex" integer NOT NULL,
    "colIndex" integer NOT NULL,
    kana text DEFAULT ''::text NOT NULL,
    romaji text DEFAULT ''::text NOT NULL
);


ALTER TABLE public."KanaCell" OWNER TO nihongo;

--
-- Name: KanaCell_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."KanaCell_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."KanaCell_id_seq" OWNER TO nihongo;

--
-- Name: KanaCell_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."KanaCell_id_seq" OWNED BY public."KanaCell".id;


--
-- Name: KanaRomaji; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."KanaRomaji" (
    id integer NOT NULL,
    kana text NOT NULL,
    romaji text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."KanaRomaji" OWNER TO nihongo;

--
-- Name: KanaRomaji_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."KanaRomaji_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."KanaRomaji_id_seq" OWNER TO nihongo;

--
-- Name: KanaRomaji_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."KanaRomaji_id_seq" OWNED BY public."KanaRomaji".id;


--
-- Name: KanaSection; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."KanaSection" (
    id integer NOT NULL,
    script public."KanaScript" NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    columns integer DEFAULT 5 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."KanaSection" OWNER TO nihongo;

--
-- Name: KanaSection_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."KanaSection_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."KanaSection_id_seq" OWNER TO nihongo;

--
-- Name: KanaSection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."KanaSection_id_seq" OWNED BY public."KanaSection".id;


--
-- Name: KanjiEntry; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."KanjiEntry" (
    id integer NOT NULL,
    "character" text NOT NULL,
    "hanViet" text,
    onyomi text,
    kunyomi text,
    "meaningVi" text NOT NULL,
    "mnemonicJp" text,
    "mnemonicVi" text,
    "imageUrl" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "lessonId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "meaningEn" text,
    "jlptLevel" public."JlptLevel",
    "strokeCount" integer,
    frequency integer,
    grade integer
);


ALTER TABLE public."KanjiEntry" OWNER TO nihongo;

--
-- Name: KanjiEntry_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."KanjiEntry_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."KanjiEntry_id_seq" OWNER TO nihongo;

--
-- Name: KanjiEntry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."KanjiEntry_id_seq" OWNED BY public."KanjiEntry".id;


--
-- Name: KanjiLesson; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."KanjiLesson" (
    id integer NOT NULL,
    "lessonNumber" integer NOT NULL,
    title text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "jlptLevel" public."JlptLevel",
    "sortOrder" integer DEFAULT 0 NOT NULL,
    textbook public."Textbook"
);


ALTER TABLE public."KanjiLesson" OWNER TO nihongo;

--
-- Name: KanjiLesson_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."KanjiLesson_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."KanjiLesson_id_seq" OWNER TO nihongo;

--
-- Name: KanjiLesson_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."KanjiLesson_id_seq" OWNED BY public."KanjiLesson".id;


--
-- Name: KanjiVocab; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."KanjiVocab" (
    id integer NOT NULL,
    word text NOT NULL,
    reading text NOT NULL,
    "meaningVi" text NOT NULL,
    "kanjiEntryId" integer NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "vocabularyId" integer,
    "exampleJa" text,
    "exampleKana" text,
    "exampleVi" text
);


ALTER TABLE public."KanjiVocab" OWNER TO nihongo;

--
-- Name: KanjiVocab_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."KanjiVocab_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."KanjiVocab_id_seq" OWNER TO nihongo;

--
-- Name: KanjiVocab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."KanjiVocab_id_seq" OWNED BY public."KanjiVocab".id;


--
-- Name: LearnerChatMember; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."LearnerChatMember" (
    id integer NOT NULL,
    "roomId" integer NOT NULL,
    "userId" integer NOT NULL,
    role public."LearnerChatMemberRole" DEFAULT 'MEMBER'::public."LearnerChatMemberRole" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LearnerChatMember" OWNER TO nihongo;

--
-- Name: LearnerChatMember_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."LearnerChatMember_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."LearnerChatMember_id_seq" OWNER TO nihongo;

--
-- Name: LearnerChatMember_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."LearnerChatMember_id_seq" OWNED BY public."LearnerChatMember".id;


--
-- Name: LearnerChatMessage; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."LearnerChatMessage" (
    id integer NOT NULL,
    "roomId" integer NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fileUrl" text,
    "fileType" text
);


ALTER TABLE public."LearnerChatMessage" OWNER TO nihongo;

--
-- Name: LearnerChatMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."LearnerChatMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."LearnerChatMessage_id_seq" OWNER TO nihongo;

--
-- Name: LearnerChatMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."LearnerChatMessage_id_seq" OWNED BY public."LearnerChatMessage".id;


--
-- Name: LearnerChatRoom; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."LearnerChatRoom" (
    id integer NOT NULL,
    name text,
    type public."LearnerChatRoomType" DEFAULT 'GROUP'::public."LearnerChatRoomType" NOT NULL,
    "createdById" integer NOT NULL,
    "lastMessageAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LearnerChatRoom" OWNER TO nihongo;

--
-- Name: LearnerChatRoom_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."LearnerChatRoom_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."LearnerChatRoom_id_seq" OWNER TO nihongo;

--
-- Name: LearnerChatRoom_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."LearnerChatRoom_id_seq" OWNED BY public."LearnerChatRoom".id;


--
-- Name: Lesson; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Lesson" (
    id integer NOT NULL,
    "lessonNumber" integer NOT NULL,
    title text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    description text,
    "jlptLevel" public."JlptLevel",
    "thumbnailUrl" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    textbook public."Textbook"
);


ALTER TABLE public."Lesson" OWNER TO nihongo;

--
-- Name: Lesson_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Lesson_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Lesson_id_seq" OWNER TO nihongo;

--
-- Name: Lesson_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Lesson_id_seq" OWNED BY public."Lesson".id;


--
-- Name: ListeningConfig; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ListeningConfig" (
    id integer DEFAULT 1 NOT NULL,
    "goalMinutes" integer DEFAULT 15 NOT NULL
);


ALTER TABLE public."ListeningConfig" OWNER TO nihongo;

--
-- Name: ListeningLog; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ListeningLog" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    seconds integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    date date NOT NULL,
    "lessonFrom" integer,
    "lessonTo" integer
);


ALTER TABLE public."ListeningLog" OWNER TO nihongo;

--
-- Name: ListeningLog_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ListeningLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ListeningLog_id_seq" OWNER TO nihongo;

--
-- Name: ListeningLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ListeningLog_id_seq" OWNED BY public."ListeningLog".id;


--
-- Name: ListeningPreset; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ListeningPreset" (
    id integer NOT NULL,
    "externalKey" text NOT NULL,
    label text NOT NULL,
    "lessonFrom" integer NOT NULL,
    "lessonTo" integer NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ListeningPreset" OWNER TO nihongo;

--
-- Name: ListeningPreset_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ListeningPreset_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ListeningPreset_id_seq" OWNER TO nihongo;

--
-- Name: ListeningPreset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ListeningPreset_id_seq" OWNED BY public."ListeningPreset".id;


--
-- Name: LiveSession; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."LiveSession" (
    id integer NOT NULL,
    "roomName" text NOT NULL,
    "coachId" integer NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'LIVE'::text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone
);


ALTER TABLE public."LiveSession" OWNER TO nihongo;

--
-- Name: LiveSession_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."LiveSession_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."LiveSession_id_seq" OWNER TO nihongo;

--
-- Name: LiveSession_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."LiveSession_id_seq" OWNED BY public."LiveSession".id;


--
-- Name: MindMapLevel; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."MindMapLevel" (
    id integer NOT NULL,
    kind public."MindMapKind" NOT NULL,
    level public."JlptLevel" NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    accent text DEFAULT '#3b82f6'::text NOT NULL,
    branches jsonb NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MindMapLevel" OWNER TO nihongo;

--
-- Name: MindMapLevel_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."MindMapLevel_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."MindMapLevel_id_seq" OWNER TO nihongo;

--
-- Name: MindMapLevel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."MindMapLevel_id_seq" OWNED BY public."MindMapLevel".id;


--
-- Name: MockExamQuestion; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."MockExamQuestion" (
    id integer NOT NULL,
    "templateId" integer NOT NULL,
    "sectionId" text NOT NULL,
    type text NOT NULL,
    question text NOT NULL,
    "correctAnswer" text NOT NULL,
    "audioText" text,
    "audioUrl" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "imageUrl" text
);


ALTER TABLE public."MockExamQuestion" OWNER TO nihongo;

--
-- Name: MockExamQuestionOption; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."MockExamQuestionOption" (
    id integer NOT NULL,
    "questionId" integer NOT NULL,
    text text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "imageUrl" text
);


ALTER TABLE public."MockExamQuestionOption" OWNER TO nihongo;

--
-- Name: MockExamQuestionOption_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."MockExamQuestionOption_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."MockExamQuestionOption_id_seq" OWNER TO nihongo;

--
-- Name: MockExamQuestionOption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."MockExamQuestionOption_id_seq" OWNED BY public."MockExamQuestionOption".id;


--
-- Name: MockExamQuestion_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."MockExamQuestion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."MockExamQuestion_id_seq" OWNER TO nihongo;

--
-- Name: MockExamQuestion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."MockExamQuestion_id_seq" OWNED BY public."MockExamQuestion".id;


--
-- Name: MockExamTemplate; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."MockExamTemplate" (
    id integer NOT NULL,
    slug text NOT NULL,
    level text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    "durationMinutes" integer NOT NULL,
    "lessonFrom" integer DEFAULT 1 NOT NULL,
    "lessonTo" integer DEFAULT 1 NOT NULL,
    "kanjiLessonFrom" integer DEFAULT 1 NOT NULL,
    "kanjiLessonTo" integer DEFAULT 1 NOT NULL,
    "vocabCount" integer DEFAULT 12 NOT NULL,
    "grammarCount" integer DEFAULT 10 NOT NULL,
    "kanjiCount" integer DEFAULT 5 NOT NULL,
    "listeningWordCount" integer DEFAULT 4 NOT NULL,
    "listeningSentenceCount" integer DEFAULT 4 NOT NULL,
    "passThreshold" integer DEFAULT 65 NOT NULL,
    scope text DEFAULT ''::text NOT NULL,
    "isPublished" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "sourceMode" text DEFAULT 'GENERATED'::text NOT NULL
);


ALTER TABLE public."MockExamTemplate" OWNER TO nihongo;

--
-- Name: MockExamTemplate_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."MockExamTemplate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."MockExamTemplate_id_seq" OWNER TO nihongo;

--
-- Name: MockExamTemplate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."MockExamTemplate_id_seq" OWNED BY public."MockExamTemplate".id;


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Notification" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    metadata jsonb,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO nihongo;

--
-- Name: Notification_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Notification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Notification_id_seq" OWNER TO nihongo;

--
-- Name: Notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Notification_id_seq" OWNED BY public."Notification".id;


--
-- Name: OutboxEvent; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."OutboxEvent" (
    id integer NOT NULL,
    topic text NOT NULL,
    key text,
    payload jsonb NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "publishedAt" timestamp(3) without time zone
);


ALTER TABLE public."OutboxEvent" OWNER TO nihongo;

--
-- Name: OutboxEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."OutboxEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."OutboxEvent_id_seq" OWNER TO nihongo;

--
-- Name: OutboxEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."OutboxEvent_id_seq" OWNED BY public."OutboxEvent".id;


--
-- Name: PageBanner; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PageBanner" (
    id integer NOT NULL,
    path text NOT NULL,
    "imageData" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PageBanner" OWNER TO nihongo;

--
-- Name: PageBanner_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."PageBanner_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PageBanner_id_seq" OWNER TO nihongo;

--
-- Name: PageBanner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."PageBanner_id_seq" OWNED BY public."PageBanner".id;


--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PasswordResetToken" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "userId" integer NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PasswordResetToken" OWNER TO nihongo;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Payment" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "amountCents" integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "stripePaymentIntentId" text,
    "stripeChargeId" text,
    "stripeReceiptUrl" text,
    "subscriptionId" integer,
    "sessionId" integer,
    "refundedAt" timestamp(3) without time zone,
    "refundAmountCents" integer,
    "refundReason" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO nihongo;

--
-- Name: Payment_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Payment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Payment_id_seq" OWNER TO nihongo;

--
-- Name: Payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Payment_id_seq" OWNED BY public."Payment".id;


--
-- Name: Payout; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Payout" (
    id integer NOT NULL,
    "coachId" integer NOT NULL,
    "amountCents" integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status public."PayoutStatus" DEFAULT 'PENDING'::public."PayoutStatus" NOT NULL,
    "stripeTransferId" text,
    "stripePayoutId" text,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "sessionCount" integer DEFAULT 0 NOT NULL,
    "grossAmountCents" integer NOT NULL,
    "feeAmountCents" integer NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "failReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Payout" OWNER TO nihongo;

--
-- Name: Payout_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Payout_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Payout_id_seq" OWNER TO nihongo;

--
-- Name: Payout_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Payout_id_seq" OWNED BY public."Payout".id;


--
-- Name: PodcastResource; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PodcastResource" (
    id integer NOT NULL,
    "externalKey" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    url text NOT NULL,
    level text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PodcastResource" OWNER TO nihongo;

--
-- Name: PodcastResource_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."PodcastResource_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PodcastResource_id_seq" OWNER TO nihongo;

--
-- Name: PodcastResource_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."PodcastResource_id_seq" OWNED BY public."PodcastResource".id;


--
-- Name: ProcessedEvent; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ProcessedEvent" (
    "eventId" text NOT NULL,
    consumer text NOT NULL,
    "processedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProcessedEvent" OWNER TO nihongo;

--
-- Name: PronunciationRuleExample; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PronunciationRuleExample" (
    id integer NOT NULL,
    "sectionId" integer NOT NULL,
    japanese text NOT NULL,
    romaji text NOT NULL,
    meaning text NOT NULL,
    note text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."PronunciationRuleExample" OWNER TO nihongo;

--
-- Name: PronunciationRuleExample_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."PronunciationRuleExample_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PronunciationRuleExample_id_seq" OWNER TO nihongo;

--
-- Name: PronunciationRuleExample_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."PronunciationRuleExample_id_seq" OWNED BY public."PronunciationRuleExample".id;


--
-- Name: PronunciationRulePoint; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PronunciationRulePoint" (
    id integer NOT NULL,
    "sectionId" integer NOT NULL,
    label text,
    japanese text,
    romaji text,
    explanation text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."PronunciationRulePoint" OWNER TO nihongo;

--
-- Name: PronunciationRulePoint_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."PronunciationRulePoint_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PronunciationRulePoint_id_seq" OWNER TO nihongo;

--
-- Name: PronunciationRulePoint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."PronunciationRulePoint_id_seq" OWNED BY public."PronunciationRulePoint".id;


--
-- Name: PronunciationRuleSection; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PronunciationRuleSection" (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PronunciationRuleSection" OWNER TO nihongo;

--
-- Name: PronunciationRuleSection_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."PronunciationRuleSection_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PronunciationRuleSection_id_seq" OWNER TO nihongo;

--
-- Name: PronunciationRuleSection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."PronunciationRuleSection_id_seq" OWNED BY public."PronunciationRuleSection".id;


--
-- Name: PronunciationRuleTip; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PronunciationRuleTip" (
    id integer NOT NULL,
    text text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PronunciationRuleTip" OWNER TO nihongo;

--
-- Name: PronunciationRuleTip_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."PronunciationRuleTip_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PronunciationRuleTip_id_seq" OWNER TO nihongo;

--
-- Name: PronunciationRuleTip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."PronunciationRuleTip_id_seq" OWNED BY public."PronunciationRuleTip".id;


--
-- Name: PronunciationRulesMeta; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PronunciationRulesMeta" (
    id integer DEFAULT 1 NOT NULL,
    intro text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PronunciationRulesMeta" OWNER TO nihongo;

--
-- Name: PushDeviceToken; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."PushDeviceToken" (
    id text NOT NULL,
    "userId" integer NOT NULL,
    token text NOT NULL,
    platform text DEFAULT 'ios'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PushDeviceToken" OWNER TO nihongo;

--
-- Name: ReadingAttempt; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ReadingAttempt" (
    id integer NOT NULL,
    "userId" integer,
    "passageId" integer NOT NULL,
    correct integer NOT NULL,
    total integer NOT NULL,
    percent double precision NOT NULL,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ReadingAttempt" OWNER TO nihongo;

--
-- Name: ReadingAttempt_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ReadingAttempt_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ReadingAttempt_id_seq" OWNER TO nihongo;

--
-- Name: ReadingAttempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ReadingAttempt_id_seq" OWNED BY public."ReadingAttempt".id;


--
-- Name: ReadingPassage; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ReadingPassage" (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "jlptLevel" public."JlptLevel",
    source text,
    "estimatedMin" integer DEFAULT 3 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ReadingPassage" OWNER TO nihongo;

--
-- Name: ReadingPassage_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ReadingPassage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ReadingPassage_id_seq" OWNER TO nihongo;

--
-- Name: ReadingPassage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ReadingPassage_id_seq" OWNED BY public."ReadingPassage".id;


--
-- Name: ReadingQuestion; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ReadingQuestion" (
    id integer NOT NULL,
    "passageId" integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    explanation text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ReadingQuestion" OWNER TO nihongo;

--
-- Name: ReadingQuestionOption; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."ReadingQuestionOption" (
    id integer NOT NULL,
    "questionId" integer NOT NULL,
    text text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ReadingQuestionOption" OWNER TO nihongo;

--
-- Name: ReadingQuestionOption_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ReadingQuestionOption_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ReadingQuestionOption_id_seq" OWNER TO nihongo;

--
-- Name: ReadingQuestionOption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ReadingQuestionOption_id_seq" OWNED BY public."ReadingQuestionOption".id;


--
-- Name: ReadingQuestion_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."ReadingQuestion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ReadingQuestion_id_seq" OWNER TO nihongo;

--
-- Name: ReadingQuestion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."ReadingQuestion_id_seq" OWNED BY public."ReadingQuestion".id;


--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" integer NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone
);


ALTER TABLE public."RefreshToken" OWNER TO nihongo;

--
-- Name: RoleplayLine; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."RoleplayLine" (
    id integer NOT NULL,
    "sceneId" integer NOT NULL,
    role text NOT NULL,
    ja text NOT NULL,
    vi text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RoleplayLine" OWNER TO nihongo;

--
-- Name: RoleplayLine_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."RoleplayLine_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RoleplayLine_id_seq" OWNER TO nihongo;

--
-- Name: RoleplayLine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."RoleplayLine_id_seq" OWNED BY public."RoleplayLine".id;


--
-- Name: RoleplayScene; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."RoleplayScene" (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    "titleJa" text NOT NULL,
    "desc" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RoleplayScene" OWNER TO nihongo;

--
-- Name: RoleplayScene_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."RoleplayScene_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RoleplayScene_id_seq" OWNER TO nihongo;

--
-- Name: RoleplayScene_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."RoleplayScene_id_seq" OWNED BY public."RoleplayScene".id;


--
-- Name: SrsCard; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."SrsCard" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "contentType" public."ContentType" NOT NULL,
    "contentId" integer NOT NULL,
    "easeFactor" double precision DEFAULT 2.5 NOT NULL,
    "interval" integer DEFAULT 0 NOT NULL,
    repetitions integer DEFAULT 0 NOT NULL,
    "nextReviewAt" timestamp(3) without time zone,
    "lastReviewedAt" timestamp(3) without time zone,
    "wrongCount" integer DEFAULT 0 NOT NULL,
    "correctCount" integer DEFAULT 0 NOT NULL,
    "reviewStreak" integer DEFAULT 0 NOT NULL,
    mastered boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SrsCard" OWNER TO nihongo;

--
-- Name: SrsCard_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."SrsCard_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SrsCard_id_seq" OWNER TO nihongo;

--
-- Name: SrsCard_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."SrsCard_id_seq" OWNED BY public."SrsCard".id;


--
-- Name: StudySession; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."StudySession" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    date date NOT NULL,
    seconds integer DEFAULT 0 NOT NULL,
    "cardsReviewed" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StudySession" OWNER TO nihongo;

--
-- Name: StudySession_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."StudySession_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."StudySession_id_seq" OWNER TO nihongo;

--
-- Name: StudySession_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."StudySession_id_seq" OWNED BY public."StudySession".id;


--
-- Name: StudyStreak; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."StudyStreak" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "currentStreak" integer DEFAULT 0 NOT NULL,
    "longestStreak" integer DEFAULT 0 NOT NULL,
    "lastStudyDate" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StudyStreak" OWNER TO nihongo;

--
-- Name: StudyStreak_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."StudyStreak_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."StudyStreak_id_seq" OWNER TO nihongo;

--
-- Name: StudyStreak_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."StudyStreak_id_seq" OWNED BY public."StudyStreak".id;


--
-- Name: StudyTip; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."StudyTip" (
    id integer NOT NULL,
    text text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StudyTip" OWNER TO nihongo;

--
-- Name: StudyTip_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."StudyTip_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."StudyTip_id_seq" OWNER TO nihongo;

--
-- Name: StudyTip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."StudyTip_id_seq" OWNED BY public."StudyTip".id;


--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Subscription" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    plan public."SubscriptionPlan" DEFAULT 'FREE'::public."SubscriptionPlan" NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    "stripeCustomerId" text,
    "stripeSubscriptionId" text,
    "stripePriceId" text,
    "currentPeriodStart" timestamp(3) without time zone,
    "currentPeriodEnd" timestamp(3) without time zone,
    "trialEnd" timestamp(3) without time zone,
    "canceledAt" timestamp(3) without time zone,
    "cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Subscription" OWNER TO nihongo;

--
-- Name: SubscriptionPlanConfig; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."SubscriptionPlanConfig" (
    id integer NOT NULL,
    plan public."SubscriptionPlan" NOT NULL,
    "displayName" text NOT NULL,
    "priceUsdCents" integer NOT NULL,
    "intervalMonths" integer DEFAULT 1 NOT NULL,
    "trialDays" integer DEFAULT 0 NOT NULL,
    features jsonb NOT NULL,
    "stripePriceId" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SubscriptionPlanConfig" OWNER TO nihongo;

--
-- Name: SubscriptionPlanConfig_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."SubscriptionPlanConfig_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SubscriptionPlanConfig_id_seq" OWNER TO nihongo;

--
-- Name: SubscriptionPlanConfig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."SubscriptionPlanConfig_id_seq" OWNED BY public."SubscriptionPlanConfig".id;


--
-- Name: Subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Subscription_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Subscription_id_seq" OWNER TO nihongo;

--
-- Name: Subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Subscription_id_seq" OWNED BY public."Subscription".id;


--
-- Name: SupportMessage; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."SupportMessage" (
    id integer NOT NULL,
    "threadId" integer NOT NULL,
    "senderId" integer NOT NULL,
    content text NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fileUrl" text,
    "fileType" text
);


ALTER TABLE public."SupportMessage" OWNER TO nihongo;

--
-- Name: SupportMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."SupportMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SupportMessage_id_seq" OWNER TO nihongo;

--
-- Name: SupportMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."SupportMessage_id_seq" OWNED BY public."SupportMessage".id;


--
-- Name: SupportThread; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."SupportThread" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "lastMessageAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SupportThread" OWNER TO nihongo;

--
-- Name: SupportThread_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."SupportThread_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SupportThread_id_seq" OWNER TO nihongo;

--
-- Name: SupportThread_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."SupportThread_id_seq" OWNED BY public."SupportThread".id;


--
-- Name: TextbookBook; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."TextbookBook" (
    id integer NOT NULL,
    "seriesId" integer NOT NULL,
    level public."JlptLevel" NOT NULL,
    title text NOT NULL,
    note text,
    url text,
    kinds public."MindMapKind"[],
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TextbookBook" OWNER TO nihongo;

--
-- Name: TextbookBook_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."TextbookBook_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TextbookBook_id_seq" OWNER TO nihongo;

--
-- Name: TextbookBook_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."TextbookBook_id_seq" OWNED BY public."TextbookBook".id;


--
-- Name: TextbookSeries; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."TextbookSeries" (
    id integer NOT NULL,
    code public."Textbook" NOT NULL,
    name text NOT NULL,
    "nameJa" text NOT NULL,
    publisher text NOT NULL,
    url text NOT NULL,
    blurb text NOT NULL,
    icon text NOT NULL,
    "planLevels" public."JlptLevel"[],
    "audioMatch" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TextbookSeries" OWNER TO nihongo;

--
-- Name: TextbookSeries_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."TextbookSeries_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TextbookSeries_id_seq" OWNER TO nihongo;

--
-- Name: TextbookSeries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."TextbookSeries_id_seq" OWNED BY public."TextbookSeries".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    "passwordHash" text,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "avatarUrl" text,
    "nativeLanguage" text DEFAULT 'vi'::text,
    "targetJlptLevel" public."JlptLevel",
    "studyGoalMinutes" integer DEFAULT 30,
    "lastActiveAt" timestamp(3) without time zone,
    "googleId" text,
    "keycloakId" text,
    "emailVerifiedAt" timestamp(3) without time zone,
    "emailBounced" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."User" OWNER TO nihongo;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO nihongo;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: VocabSuffixGroup; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."VocabSuffixGroup" (
    id integer NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    hint text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "labelJa" text DEFAULT ''::text NOT NULL
);


ALTER TABLE public."VocabSuffixGroup" OWNER TO nihongo;

--
-- Name: VocabSuffixGroup_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."VocabSuffixGroup_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."VocabSuffixGroup_id_seq" OWNER TO nihongo;

--
-- Name: VocabSuffixGroup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."VocabSuffixGroup_id_seq" OWNED BY public."VocabSuffixGroup".id;


--
-- Name: VocabSuffixItem; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."VocabSuffixItem" (
    id integer NOT NULL,
    "groupId" integer NOT NULL,
    suffix text NOT NULL,
    kana text NOT NULL,
    romaji text NOT NULL,
    "meaningVi" text NOT NULL,
    "attachesTo" text NOT NULL,
    "exampleJa" text NOT NULL,
    "exampleVi" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    forms text[] DEFAULT ARRAY[]::text[] NOT NULL,
    pos text[] DEFAULT ARRAY[]::text[] NOT NULL
);


ALTER TABLE public."VocabSuffixItem" OWNER TO nihongo;

--
-- Name: VocabSuffixItem_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."VocabSuffixItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."VocabSuffixItem_id_seq" OWNER TO nihongo;

--
-- Name: VocabSuffixItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."VocabSuffixItem_id_seq" OWNED BY public."VocabSuffixItem".id;


--
-- Name: Vocabulary; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."Vocabulary" (
    id integer NOT NULL,
    kanji text,
    kana text NOT NULL,
    romaji text NOT NULL,
    meaning text NOT NULL,
    "lessonId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "meaningEn" text,
    "partOfSpeech" text,
    "jlptLevel" public."JlptLevel",
    "pitchAccent" text,
    "audioUrl" text,
    "frequencyRank" integer,
    "imageUrl" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Vocabulary" OWNER TO nihongo;

--
-- Name: VocabularyExample; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."VocabularyExample" (
    id integer NOT NULL,
    "vocabularyId" integer NOT NULL,
    ja text NOT NULL,
    kana text,
    vi text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VocabularyExample" OWNER TO nihongo;

--
-- Name: VocabularyExample_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."VocabularyExample_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."VocabularyExample_id_seq" OWNER TO nihongo;

--
-- Name: VocabularyExample_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."VocabularyExample_id_seq" OWNED BY public."VocabularyExample".id;


--
-- Name: VocabularyKanjiLink; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."VocabularyKanjiLink" (
    id integer NOT NULL,
    "vocabularyId" integer NOT NULL,
    "kanjiEntryId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."VocabularyKanjiLink" OWNER TO nihongo;

--
-- Name: VocabularyKanjiLink_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."VocabularyKanjiLink_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."VocabularyKanjiLink_id_seq" OWNER TO nihongo;

--
-- Name: VocabularyKanjiLink_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."VocabularyKanjiLink_id_seq" OWNED BY public."VocabularyKanjiLink".id;


--
-- Name: Vocabulary_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."Vocabulary_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Vocabulary_id_seq" OWNER TO nihongo;

--
-- Name: Vocabulary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."Vocabulary_id_seq" OWNED BY public."Vocabulary".id;


--
-- Name: WebhookEvent; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public."WebhookEvent" (
    id integer NOT NULL,
    provider text NOT NULL,
    "eventId" text NOT NULL,
    "eventType" text NOT NULL,
    payload jsonb NOT NULL,
    status public."WebhookEventStatus" DEFAULT 'RECEIVED'::public."WebhookEventStatus" NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "errorMessage" text,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."WebhookEvent" OWNER TO nihongo;

--
-- Name: WebhookEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: nihongo
--

CREATE SEQUENCE public."WebhookEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."WebhookEvent_id_seq" OWNER TO nihongo;

--
-- Name: WebhookEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nihongo
--

ALTER SEQUENCE public."WebhookEvent_id_seq" OWNED BY public."WebhookEvent".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: nihongo
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO nihongo;

--
-- Name: learner_daily_study; Type: VIEW; Schema: public; Owner: nihongo
--

CREATE VIEW public.learner_daily_study AS
 WITH days AS (
         SELECT "StudySession"."userId",
            "StudySession".date AS "studyDate"
           FROM public."StudySession"
        UNION
         SELECT "DailyActivity"."userId",
            ("DailyActivity".date)::date AS date
           FROM public."DailyActivity"
        )
 SELECT d."userId",
    d."studyDate",
    COALESCE(s.seconds, 0) AS seconds,
    COALESCE(s."cardsReviewed", 0) AS "cardsReviewed",
    COALESCE(v.count, 0) AS "vocabCount",
    COALESCE(k.count, 0) AS "kanjiCount"
   FROM (((days d
     LEFT JOIN public."StudySession" s ON (((s."userId" = d."userId") AND (s.date = d."studyDate"))))
     LEFT JOIN public."DailyActivity" v ON (((v."userId" = d."userId") AND (v.date = to_char((d."studyDate")::timestamp with time zone, 'YYYY-MM-DD'::text)) AND (v.kind = 'vocab'::text))))
     LEFT JOIN public."DailyActivity" k ON (((k."userId" = d."userId") AND (k.date = to_char((d."studyDate")::timestamp with time zone, 'YYYY-MM-DD'::text)) AND (k.kind = 'kanji'::text))));


ALTER VIEW public.learner_daily_study OWNER TO nihongo;

--
-- Name: learner_progress_summary; Type: MATERIALIZED VIEW; Schema: public; Owner: nihongo
--

CREATE MATERIALIZED VIEW public.learner_progress_summary AS
 SELECT u.id AS "userId",
    COALESCE(st."currentStreak", 0) AS "currentStreak",
    COALESCE(st."longestStreak", 0) AS "longestStreak",
    (COALESCE(sess.total_seconds, (0)::bigint))::integer AS "totalSeconds",
    (COALESCE(sess.total_cards, (0)::bigint))::integer AS "totalCards",
    (COALESCE(act.vocab_total, (0)::bigint))::integer AS "vocabTotal",
    (COALESCE(act.kanji_total, (0)::bigint))::integer AS "kanjiTotal"
   FROM (((public."User" u
     LEFT JOIN public."StudyStreak" st ON ((st."userId" = u.id)))
     LEFT JOIN ( SELECT "StudySession"."userId",
            sum("StudySession".seconds) AS total_seconds,
            sum("StudySession"."cardsReviewed") AS total_cards
           FROM public."StudySession"
          GROUP BY "StudySession"."userId") sess ON ((sess."userId" = u.id)))
     LEFT JOIN ( SELECT "DailyActivity"."userId",
            sum("DailyActivity".count) FILTER (WHERE ("DailyActivity".kind = 'vocab'::text)) AS vocab_total,
            sum("DailyActivity".count) FILTER (WHERE ("DailyActivity".kind = 'kanji'::text)) AS kanji_total
           FROM public."DailyActivity"
          GROUP BY "DailyActivity"."userId") act ON ((act."userId" = u.id)))
  WHERE ((st."userId" IS NOT NULL) OR (sess."userId" IS NOT NULL) OR (act."userId" IS NOT NULL))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.learner_progress_summary OWNER TO nihongo;

--
-- Name: BookAudioDriveFolder id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioDriveFolder" ALTER COLUMN id SET DEFAULT nextval('public."BookAudioDriveFolder_id_seq"'::regclass);


--
-- Name: BookAudioFile id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioFile" ALTER COLUMN id SET DEFAULT nextval('public."BookAudioFile_id_seq"'::regclass);


--
-- Name: BookAudioItem id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioItem" ALTER COLUMN id SET DEFAULT nextval('public."BookAudioItem_id_seq"'::regclass);


--
-- Name: ChatMessage id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ChatMessage" ALTER COLUMN id SET DEFAULT nextval('public."ChatMessage_id_seq"'::regclass);


--
-- Name: CoachAvailability id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachAvailability" ALTER COLUMN id SET DEFAULT nextval('public."CoachAvailability_id_seq"'::regclass);


--
-- Name: CoachProfile id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachProfile" ALTER COLUMN id SET DEFAULT nextval('public."CoachProfile_id_seq"'::regclass);


--
-- Name: CoachReview id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachReview" ALTER COLUMN id SET DEFAULT nextval('public."CoachReview_id_seq"'::regclass);


--
-- Name: CoachingSession id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachingSession" ALTER COLUMN id SET DEFAULT nextval('public."CoachingSession_id_seq"'::regclass);


--
-- Name: ConversationIntroExample id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationIntroExample" ALTER COLUMN id SET DEFAULT nextval('public."ConversationIntroExample_id_seq"'::regclass);


--
-- Name: ConversationIntroLine id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationIntroLine" ALTER COLUMN id SET DEFAULT nextval('public."ConversationIntroLine_id_seq"'::regclass);


--
-- Name: ConversationIntroSlot id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationIntroSlot" ALTER COLUMN id SET DEFAULT nextval('public."ConversationIntroSlot_id_seq"'::regclass);


--
-- Name: ConversationPhraseGroup id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationPhraseGroup" ALTER COLUMN id SET DEFAULT nextval('public."ConversationPhraseGroup_id_seq"'::regclass);


--
-- Name: ConversationPhraseItem id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationPhraseItem" ALTER COLUMN id SET DEFAULT nextval('public."ConversationPhraseItem_id_seq"'::regclass);


--
-- Name: CounterCategory id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CounterCategory" ALTER COLUMN id SET DEFAULT nextval('public."CounterCategory_id_seq"'::regclass);


--
-- Name: CounterItem id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CounterItem" ALTER COLUMN id SET DEFAULT nextval('public."CounterItem_id_seq"'::regclass);


--
-- Name: CountryNameItem id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CountryNameItem" ALTER COLUMN id SET DEFAULT nextval('public."CountryNameItem_id_seq"'::regclass);


--
-- Name: CountryRegion id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CountryRegion" ALTER COLUMN id SET DEFAULT nextval('public."CountryRegion_id_seq"'::regclass);


--
-- Name: DailyActivity id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyActivity" ALTER COLUMN id SET DEFAULT nextval('public."DailyActivity_id_seq"'::regclass);


--
-- Name: DailyGoal id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyGoal" ALTER COLUMN id SET DEFAULT nextval('public."DailyGoal_id_seq"'::regclass);


--
-- Name: DailyGoalItem id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyGoalItem" ALTER COLUMN id SET DEFAULT nextval('public."DailyGoalItem_id_seq"'::regclass);


--
-- Name: DailyNote id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyNote" ALTER COLUMN id SET DEFAULT nextval('public."DailyNote_id_seq"'::regclass);


--
-- Name: DictationAttempt id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DictationAttempt" ALTER COLUMN id SET DEFAULT nextval('public."DictationAttempt_id_seq"'::regclass);


--
-- Name: EmailPrefs id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EmailPrefs" ALTER COLUMN id SET DEFAULT nextval('public."EmailPrefs_id_seq"'::regclass);


--
-- Name: EmailTemplate id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EmailTemplate" ALTER COLUMN id SET DEFAULT nextval('public."EmailTemplate_id_seq"'::regclass);


--
-- Name: EnglishKatakanaExample id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaExample" ALTER COLUMN id SET DEFAULT nextval('public."EnglishKatakanaExample_id_seq"'::regclass);


--
-- Name: EnglishKatakanaMapping id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaMapping" ALTER COLUMN id SET DEFAULT nextval('public."EnglishKatakanaMapping_id_seq"'::regclass);


--
-- Name: EnglishKatakanaPoint id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaPoint" ALTER COLUMN id SET DEFAULT nextval('public."EnglishKatakanaPoint_id_seq"'::regclass);


--
-- Name: EnglishKatakanaSection id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaSection" ALTER COLUMN id SET DEFAULT nextval('public."EnglishKatakanaSection_id_seq"'::regclass);


--
-- Name: EnglishKatakanaTip id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaTip" ALTER COLUMN id SET DEFAULT nextval('public."EnglishKatakanaTip_id_seq"'::regclass);


--
-- Name: ExamResult id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExamResult" ALTER COLUMN id SET DEFAULT nextval('public."ExamResult_id_seq"'::regclass);


--
-- Name: ExamSectionResult id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExamSectionResult" ALTER COLUMN id SET DEFAULT nextval('public."ExamSectionResult_id_seq"'::regclass);


--
-- Name: Example id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Example" ALTER COLUMN id SET DEFAULT nextval('public."Example_id_seq"'::regclass);


--
-- Name: Exercise id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Exercise" ALTER COLUMN id SET DEFAULT nextval('public."Exercise_id_seq"'::regclass);


--
-- Name: ExerciseOption id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExerciseOption" ALTER COLUMN id SET DEFAULT nextval('public."ExerciseOption_id_seq"'::regclass);


--
-- Name: Grammar id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Grammar" ALTER COLUMN id SET DEFAULT nextval('public."Grammar_id_seq"'::regclass);


--
-- Name: HomeFeatureItem id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."HomeFeatureItem" ALTER COLUMN id SET DEFAULT nextval('public."HomeFeatureItem_id_seq"'::regclass);


--
-- Name: HomeFeatureSection id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."HomeFeatureSection" ALTER COLUMN id SET DEFAULT nextval('public."HomeFeatureSection_id_seq"'::regclass);


--
-- Name: HomeStat id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."HomeStat" ALTER COLUMN id SET DEFAULT nextval('public."HomeStat_id_seq"'::regclass);


--
-- Name: JlptExamDaySlot id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptExamDaySlot" ALTER COLUMN id SET DEFAULT nextval('public."JlptExamDaySlot_id_seq"'::regclass);


--
-- Name: JlptExamSession id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptExamSession" ALTER COLUMN id SET DEFAULT nextval('public."JlptExamSession_id_seq"'::regclass);


--
-- Name: JlptExamVenue id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptExamVenue" ALTER COLUMN id SET DEFAULT nextval('public."JlptExamVenue_id_seq"'::regclass);


--
-- Name: JlptRoadmapExamSection id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapExamSection" ALTER COLUMN id SET DEFAULT nextval('public."JlptRoadmapExamSection_id_seq"'::regclass);


--
-- Name: JlptRoadmapLevel id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapLevel" ALTER COLUMN id SET DEFAULT nextval('public."JlptRoadmapLevel_id_seq"'::regclass);


--
-- Name: JlptRoadmapMaterial id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapMaterial" ALTER COLUMN id SET DEFAULT nextval('public."JlptRoadmapMaterial_id_seq"'::regclass);


--
-- Name: JlptRoadmapPhase id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapPhase" ALTER COLUMN id SET DEFAULT nextval('public."JlptRoadmapPhase_id_seq"'::regclass);


--
-- Name: JlptRoadmapTask id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapTask" ALTER COLUMN id SET DEFAULT nextval('public."JlptRoadmapTask_id_seq"'::regclass);


--
-- Name: KanaCell id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanaCell" ALTER COLUMN id SET DEFAULT nextval('public."KanaCell_id_seq"'::regclass);


--
-- Name: KanaRomaji id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanaRomaji" ALTER COLUMN id SET DEFAULT nextval('public."KanaRomaji_id_seq"'::regclass);


--
-- Name: KanaSection id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanaSection" ALTER COLUMN id SET DEFAULT nextval('public."KanaSection_id_seq"'::regclass);


--
-- Name: KanjiEntry id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiEntry" ALTER COLUMN id SET DEFAULT nextval('public."KanjiEntry_id_seq"'::regclass);


--
-- Name: KanjiLesson id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiLesson" ALTER COLUMN id SET DEFAULT nextval('public."KanjiLesson_id_seq"'::regclass);


--
-- Name: KanjiVocab id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiVocab" ALTER COLUMN id SET DEFAULT nextval('public."KanjiVocab_id_seq"'::regclass);


--
-- Name: LearnerChatMember id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatMember" ALTER COLUMN id SET DEFAULT nextval('public."LearnerChatMember_id_seq"'::regclass);


--
-- Name: LearnerChatMessage id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatMessage" ALTER COLUMN id SET DEFAULT nextval('public."LearnerChatMessage_id_seq"'::regclass);


--
-- Name: LearnerChatRoom id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatRoom" ALTER COLUMN id SET DEFAULT nextval('public."LearnerChatRoom_id_seq"'::regclass);


--
-- Name: Lesson id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Lesson" ALTER COLUMN id SET DEFAULT nextval('public."Lesson_id_seq"'::regclass);


--
-- Name: ListeningLog id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ListeningLog" ALTER COLUMN id SET DEFAULT nextval('public."ListeningLog_id_seq"'::regclass);


--
-- Name: ListeningPreset id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ListeningPreset" ALTER COLUMN id SET DEFAULT nextval('public."ListeningPreset_id_seq"'::regclass);


--
-- Name: LiveSession id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LiveSession" ALTER COLUMN id SET DEFAULT nextval('public."LiveSession_id_seq"'::regclass);


--
-- Name: MindMapLevel id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MindMapLevel" ALTER COLUMN id SET DEFAULT nextval('public."MindMapLevel_id_seq"'::regclass);


--
-- Name: MockExamQuestion id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MockExamQuestion" ALTER COLUMN id SET DEFAULT nextval('public."MockExamQuestion_id_seq"'::regclass);


--
-- Name: MockExamQuestionOption id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MockExamQuestionOption" ALTER COLUMN id SET DEFAULT nextval('public."MockExamQuestionOption_id_seq"'::regclass);


--
-- Name: MockExamTemplate id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MockExamTemplate" ALTER COLUMN id SET DEFAULT nextval('public."MockExamTemplate_id_seq"'::regclass);


--
-- Name: Notification id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Notification" ALTER COLUMN id SET DEFAULT nextval('public."Notification_id_seq"'::regclass);


--
-- Name: OutboxEvent id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."OutboxEvent" ALTER COLUMN id SET DEFAULT nextval('public."OutboxEvent_id_seq"'::regclass);


--
-- Name: PageBanner id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PageBanner" ALTER COLUMN id SET DEFAULT nextval('public."PageBanner_id_seq"'::regclass);


--
-- Name: Payment id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Payment" ALTER COLUMN id SET DEFAULT nextval('public."Payment_id_seq"'::regclass);


--
-- Name: Payout id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Payout" ALTER COLUMN id SET DEFAULT nextval('public."Payout_id_seq"'::regclass);


--
-- Name: PodcastResource id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PodcastResource" ALTER COLUMN id SET DEFAULT nextval('public."PodcastResource_id_seq"'::regclass);


--
-- Name: PronunciationRuleExample id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRuleExample" ALTER COLUMN id SET DEFAULT nextval('public."PronunciationRuleExample_id_seq"'::regclass);


--
-- Name: PronunciationRulePoint id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRulePoint" ALTER COLUMN id SET DEFAULT nextval('public."PronunciationRulePoint_id_seq"'::regclass);


--
-- Name: PronunciationRuleSection id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRuleSection" ALTER COLUMN id SET DEFAULT nextval('public."PronunciationRuleSection_id_seq"'::regclass);


--
-- Name: PronunciationRuleTip id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRuleTip" ALTER COLUMN id SET DEFAULT nextval('public."PronunciationRuleTip_id_seq"'::regclass);


--
-- Name: ReadingAttempt id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingAttempt" ALTER COLUMN id SET DEFAULT nextval('public."ReadingAttempt_id_seq"'::regclass);


--
-- Name: ReadingPassage id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingPassage" ALTER COLUMN id SET DEFAULT nextval('public."ReadingPassage_id_seq"'::regclass);


--
-- Name: ReadingQuestion id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingQuestion" ALTER COLUMN id SET DEFAULT nextval('public."ReadingQuestion_id_seq"'::regclass);


--
-- Name: ReadingQuestionOption id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingQuestionOption" ALTER COLUMN id SET DEFAULT nextval('public."ReadingQuestionOption_id_seq"'::regclass);


--
-- Name: RoleplayLine id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."RoleplayLine" ALTER COLUMN id SET DEFAULT nextval('public."RoleplayLine_id_seq"'::regclass);


--
-- Name: RoleplayScene id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."RoleplayScene" ALTER COLUMN id SET DEFAULT nextval('public."RoleplayScene_id_seq"'::regclass);


--
-- Name: SrsCard id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SrsCard" ALTER COLUMN id SET DEFAULT nextval('public."SrsCard_id_seq"'::regclass);


--
-- Name: StudySession id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."StudySession" ALTER COLUMN id SET DEFAULT nextval('public."StudySession_id_seq"'::regclass);


--
-- Name: StudyStreak id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."StudyStreak" ALTER COLUMN id SET DEFAULT nextval('public."StudyStreak_id_seq"'::regclass);


--
-- Name: StudyTip id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."StudyTip" ALTER COLUMN id SET DEFAULT nextval('public."StudyTip_id_seq"'::regclass);


--
-- Name: Subscription id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Subscription" ALTER COLUMN id SET DEFAULT nextval('public."Subscription_id_seq"'::regclass);


--
-- Name: SubscriptionPlanConfig id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SubscriptionPlanConfig" ALTER COLUMN id SET DEFAULT nextval('public."SubscriptionPlanConfig_id_seq"'::regclass);


--
-- Name: SupportMessage id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SupportMessage" ALTER COLUMN id SET DEFAULT nextval('public."SupportMessage_id_seq"'::regclass);


--
-- Name: SupportThread id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SupportThread" ALTER COLUMN id SET DEFAULT nextval('public."SupportThread_id_seq"'::regclass);


--
-- Name: TextbookBook id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."TextbookBook" ALTER COLUMN id SET DEFAULT nextval('public."TextbookBook_id_seq"'::regclass);


--
-- Name: TextbookSeries id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."TextbookSeries" ALTER COLUMN id SET DEFAULT nextval('public."TextbookSeries_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: VocabSuffixGroup id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabSuffixGroup" ALTER COLUMN id SET DEFAULT nextval('public."VocabSuffixGroup_id_seq"'::regclass);


--
-- Name: VocabSuffixItem id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabSuffixItem" ALTER COLUMN id SET DEFAULT nextval('public."VocabSuffixItem_id_seq"'::regclass);


--
-- Name: Vocabulary id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Vocabulary" ALTER COLUMN id SET DEFAULT nextval('public."Vocabulary_id_seq"'::regclass);


--
-- Name: VocabularyExample id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabularyExample" ALTER COLUMN id SET DEFAULT nextval('public."VocabularyExample_id_seq"'::regclass);


--
-- Name: VocabularyKanjiLink id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabularyKanjiLink" ALTER COLUMN id SET DEFAULT nextval('public."VocabularyKanjiLink_id_seq"'::regclass);


--
-- Name: WebhookEvent id; Type: DEFAULT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."WebhookEvent" ALTER COLUMN id SET DEFAULT nextval('public."WebhookEvent_id_seq"'::regclass);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: flyway; Owner: nihongo
--

ALTER TABLE ONLY flyway.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: churn_risk churn_risk_pkey; Type: CONSTRAINT; Schema: insights; Owner: nihongo
--

ALTER TABLE ONLY insights.churn_risk
    ADD CONSTRAINT churn_risk_pkey PRIMARY KEY (day, user_id);


--
-- Name: daily_kpi daily_kpi_pkey; Type: CONSTRAINT; Schema: insights; Owner: nihongo
--

ALTER TABLE ONLY insights.daily_kpi
    ADD CONSTRAINT daily_kpi_pkey PRIMARY KEY (day);


--
-- Name: learner_day learner_day_pkey; Type: CONSTRAINT; Schema: insights; Owner: nihongo
--

ALTER TABLE ONLY insights.learner_day
    ADD CONSTRAINT learner_day_pkey PRIMARY KEY (day, user_id);


--
-- Name: reengagement reengagement_pkey; Type: CONSTRAINT; Schema: insights; Owner: nihongo
--

ALTER TABLE ONLY insights.reengagement
    ADD CONSTRAINT reengagement_pkey PRIMARY KEY (user_id, day);


--
-- Name: BookAudioDriveFolder BookAudioDriveFolder_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioDriveFolder"
    ADD CONSTRAINT "BookAudioDriveFolder_pkey" PRIMARY KEY (id);


--
-- Name: BookAudioFile BookAudioFile_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioFile"
    ADD CONSTRAINT "BookAudioFile_pkey" PRIMARY KEY (id);


--
-- Name: BookAudioItem BookAudioItem_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioItem"
    ADD CONSTRAINT "BookAudioItem_pkey" PRIMARY KEY (id);


--
-- Name: BookAudioMeta BookAudioMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioMeta"
    ADD CONSTRAINT "BookAudioMeta_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: CoachAvailability CoachAvailability_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachAvailability"
    ADD CONSTRAINT "CoachAvailability_pkey" PRIMARY KEY (id);


--
-- Name: CoachProfile CoachProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachProfile"
    ADD CONSTRAINT "CoachProfile_pkey" PRIMARY KEY (id);


--
-- Name: CoachReview CoachReview_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachReview"
    ADD CONSTRAINT "CoachReview_pkey" PRIMARY KEY (id);


--
-- Name: CoachingSession CoachingSession_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachingSession"
    ADD CONSTRAINT "CoachingSession_pkey" PRIMARY KEY (id);


--
-- Name: ConversationIntroExample ConversationIntroExample_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationIntroExample"
    ADD CONSTRAINT "ConversationIntroExample_pkey" PRIMARY KEY (id);


--
-- Name: ConversationIntroLine ConversationIntroLine_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationIntroLine"
    ADD CONSTRAINT "ConversationIntroLine_pkey" PRIMARY KEY (id);


--
-- Name: ConversationIntroSlot ConversationIntroSlot_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationIntroSlot"
    ADD CONSTRAINT "ConversationIntroSlot_pkey" PRIMARY KEY (id);


--
-- Name: ConversationPhraseGroup ConversationPhraseGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationPhraseGroup"
    ADD CONSTRAINT "ConversationPhraseGroup_pkey" PRIMARY KEY (id);


--
-- Name: ConversationPhraseItem ConversationPhraseItem_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationPhraseItem"
    ADD CONSTRAINT "ConversationPhraseItem_pkey" PRIMARY KEY (id);


--
-- Name: CounterCategory CounterCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CounterCategory"
    ADD CONSTRAINT "CounterCategory_pkey" PRIMARY KEY (id);


--
-- Name: CounterItem CounterItem_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CounterItem"
    ADD CONSTRAINT "CounterItem_pkey" PRIMARY KEY (id);


--
-- Name: CountryNameItem CountryNameItem_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CountryNameItem"
    ADD CONSTRAINT "CountryNameItem_pkey" PRIMARY KEY (id);


--
-- Name: CountryRegion CountryRegion_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CountryRegion"
    ADD CONSTRAINT "CountryRegion_pkey" PRIMARY KEY (id);


--
-- Name: CronRun CronRun_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CronRun"
    ADD CONSTRAINT "CronRun_pkey" PRIMARY KEY (name, slot);


--
-- Name: DailyActivity DailyActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyActivity"
    ADD CONSTRAINT "DailyActivity_pkey" PRIMARY KEY (id);


--
-- Name: DailyGoalItem DailyGoalItem_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyGoalItem"
    ADD CONSTRAINT "DailyGoalItem_pkey" PRIMARY KEY (id);


--
-- Name: DailyGoal DailyGoal_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyGoal"
    ADD CONSTRAINT "DailyGoal_pkey" PRIMARY KEY (id);


--
-- Name: DailyNote DailyNote_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyNote"
    ADD CONSTRAINT "DailyNote_pkey" PRIMARY KEY (id);


--
-- Name: DictationAttempt DictationAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DictationAttempt"
    ADD CONSTRAINT "DictationAttempt_pkey" PRIMARY KEY (id);


--
-- Name: EmailBroadcast EmailBroadcast_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EmailBroadcast"
    ADD CONSTRAINT "EmailBroadcast_pkey" PRIMARY KEY (id);


--
-- Name: EmailPrefs EmailPrefs_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EmailPrefs"
    ADD CONSTRAINT "EmailPrefs_pkey" PRIMARY KEY (id);


--
-- Name: EmailTemplate EmailTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EmailTemplate"
    ADD CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY (id);


--
-- Name: EmailVerificationToken EmailVerificationToken_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY (id);


--
-- Name: EnglishKatakanaExample EnglishKatakanaExample_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaExample"
    ADD CONSTRAINT "EnglishKatakanaExample_pkey" PRIMARY KEY (id);


--
-- Name: EnglishKatakanaMapping EnglishKatakanaMapping_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaMapping"
    ADD CONSTRAINT "EnglishKatakanaMapping_pkey" PRIMARY KEY (id);


--
-- Name: EnglishKatakanaMeta EnglishKatakanaMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaMeta"
    ADD CONSTRAINT "EnglishKatakanaMeta_pkey" PRIMARY KEY (id);


--
-- Name: EnglishKatakanaPoint EnglishKatakanaPoint_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaPoint"
    ADD CONSTRAINT "EnglishKatakanaPoint_pkey" PRIMARY KEY (id);


--
-- Name: EnglishKatakanaSection EnglishKatakanaSection_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaSection"
    ADD CONSTRAINT "EnglishKatakanaSection_pkey" PRIMARY KEY (id);


--
-- Name: EnglishKatakanaTip EnglishKatakanaTip_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaTip"
    ADD CONSTRAINT "EnglishKatakanaTip_pkey" PRIMARY KEY (id);


--
-- Name: ExamResult ExamResult_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExamResult"
    ADD CONSTRAINT "ExamResult_pkey" PRIMARY KEY (id);


--
-- Name: ExamSectionResult ExamSectionResult_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExamSectionResult"
    ADD CONSTRAINT "ExamSectionResult_pkey" PRIMARY KEY (id);


--
-- Name: Example Example_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Example"
    ADD CONSTRAINT "Example_pkey" PRIMARY KEY (id);


--
-- Name: ExerciseOption ExerciseOption_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExerciseOption"
    ADD CONSTRAINT "ExerciseOption_pkey" PRIMARY KEY (id);


--
-- Name: Exercise Exercise_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Exercise"
    ADD CONSTRAINT "Exercise_pkey" PRIMARY KEY (id);


--
-- Name: FeatureFlag FeatureFlag_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."FeatureFlag"
    ADD CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY (key);


--
-- Name: Grammar Grammar_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Grammar"
    ADD CONSTRAINT "Grammar_pkey" PRIMARY KEY (id);


--
-- Name: HomeFeatureItem HomeFeatureItem_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."HomeFeatureItem"
    ADD CONSTRAINT "HomeFeatureItem_pkey" PRIMARY KEY (id);


--
-- Name: HomeFeatureSection HomeFeatureSection_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."HomeFeatureSection"
    ADD CONSTRAINT "HomeFeatureSection_pkey" PRIMARY KEY (id);


--
-- Name: HomeStat HomeStat_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."HomeStat"
    ADD CONSTRAINT "HomeStat_pkey" PRIMARY KEY (id);


--
-- Name: JlptExamBriefing JlptExamBriefing_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptExamBriefing"
    ADD CONSTRAINT "JlptExamBriefing_pkey" PRIMARY KEY (id);


--
-- Name: JlptExamDaySlot JlptExamDaySlot_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptExamDaySlot"
    ADD CONSTRAINT "JlptExamDaySlot_pkey" PRIMARY KEY (id);


--
-- Name: JlptExamFeeInfo JlptExamFeeInfo_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptExamFeeInfo"
    ADD CONSTRAINT "JlptExamFeeInfo_pkey" PRIMARY KEY (id);


--
-- Name: JlptExamSession JlptExamSession_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptExamSession"
    ADD CONSTRAINT "JlptExamSession_pkey" PRIMARY KEY (id);


--
-- Name: JlptExamVenue JlptExamVenue_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptExamVenue"
    ADD CONSTRAINT "JlptExamVenue_pkey" PRIMARY KEY (id);


--
-- Name: JlptOrganizer JlptOrganizer_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptOrganizer"
    ADD CONSTRAINT "JlptOrganizer_pkey" PRIMARY KEY (id);


--
-- Name: JlptRoadmapExamSection JlptRoadmapExamSection_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapExamSection"
    ADD CONSTRAINT "JlptRoadmapExamSection_pkey" PRIMARY KEY (id);


--
-- Name: JlptRoadmapLevel JlptRoadmapLevel_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapLevel"
    ADD CONSTRAINT "JlptRoadmapLevel_pkey" PRIMARY KEY (id);


--
-- Name: JlptRoadmapMaterial JlptRoadmapMaterial_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapMaterial"
    ADD CONSTRAINT "JlptRoadmapMaterial_pkey" PRIMARY KEY (id);


--
-- Name: JlptRoadmapMeta JlptRoadmapMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapMeta"
    ADD CONSTRAINT "JlptRoadmapMeta_pkey" PRIMARY KEY (id);


--
-- Name: JlptRoadmapPhase JlptRoadmapPhase_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapPhase"
    ADD CONSTRAINT "JlptRoadmapPhase_pkey" PRIMARY KEY (id);


--
-- Name: JlptRoadmapTask JlptRoadmapTask_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapTask"
    ADD CONSTRAINT "JlptRoadmapTask_pkey" PRIMARY KEY (id);


--
-- Name: KanaCell KanaCell_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanaCell"
    ADD CONSTRAINT "KanaCell_pkey" PRIMARY KEY (id);


--
-- Name: KanaRomaji KanaRomaji_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanaRomaji"
    ADD CONSTRAINT "KanaRomaji_pkey" PRIMARY KEY (id);


--
-- Name: KanaSection KanaSection_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanaSection"
    ADD CONSTRAINT "KanaSection_pkey" PRIMARY KEY (id);


--
-- Name: KanjiEntry KanjiEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiEntry"
    ADD CONSTRAINT "KanjiEntry_pkey" PRIMARY KEY (id);


--
-- Name: KanjiLesson KanjiLesson_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiLesson"
    ADD CONSTRAINT "KanjiLesson_pkey" PRIMARY KEY (id);


--
-- Name: KanjiVocab KanjiVocab_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiVocab"
    ADD CONSTRAINT "KanjiVocab_pkey" PRIMARY KEY (id);


--
-- Name: LearnerChatMember LearnerChatMember_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatMember"
    ADD CONSTRAINT "LearnerChatMember_pkey" PRIMARY KEY (id);


--
-- Name: LearnerChatMessage LearnerChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatMessage"
    ADD CONSTRAINT "LearnerChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: LearnerChatRoom LearnerChatRoom_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatRoom"
    ADD CONSTRAINT "LearnerChatRoom_pkey" PRIMARY KEY (id);


--
-- Name: Lesson Lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Lesson"
    ADD CONSTRAINT "Lesson_pkey" PRIMARY KEY (id);


--
-- Name: ListeningConfig ListeningConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ListeningConfig"
    ADD CONSTRAINT "ListeningConfig_pkey" PRIMARY KEY (id);


--
-- Name: ListeningLog ListeningLog_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ListeningLog"
    ADD CONSTRAINT "ListeningLog_pkey" PRIMARY KEY (id);


--
-- Name: ListeningLog ListeningLog_userId_date_key; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ListeningLog"
    ADD CONSTRAINT "ListeningLog_userId_date_key" UNIQUE ("userId", date);


--
-- Name: ListeningPreset ListeningPreset_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ListeningPreset"
    ADD CONSTRAINT "ListeningPreset_pkey" PRIMARY KEY (id);


--
-- Name: LiveSession LiveSession_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LiveSession"
    ADD CONSTRAINT "LiveSession_pkey" PRIMARY KEY (id);


--
-- Name: MindMapLevel MindMapLevel_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MindMapLevel"
    ADD CONSTRAINT "MindMapLevel_pkey" PRIMARY KEY (id);


--
-- Name: MockExamQuestionOption MockExamQuestionOption_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MockExamQuestionOption"
    ADD CONSTRAINT "MockExamQuestionOption_pkey" PRIMARY KEY (id);


--
-- Name: MockExamQuestion MockExamQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MockExamQuestion"
    ADD CONSTRAINT "MockExamQuestion_pkey" PRIMARY KEY (id);


--
-- Name: MockExamTemplate MockExamTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MockExamTemplate"
    ADD CONSTRAINT "MockExamTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OutboxEvent OutboxEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."OutboxEvent"
    ADD CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY (id);


--
-- Name: PageBanner PageBanner_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PageBanner"
    ADD CONSTRAINT "PageBanner_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Payout Payout_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Payout"
    ADD CONSTRAINT "Payout_pkey" PRIMARY KEY (id);


--
-- Name: PodcastResource PodcastResource_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PodcastResource"
    ADD CONSTRAINT "PodcastResource_pkey" PRIMARY KEY (id);


--
-- Name: ProcessedEvent ProcessedEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ProcessedEvent"
    ADD CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("eventId", consumer);


--
-- Name: PronunciationRuleExample PronunciationRuleExample_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRuleExample"
    ADD CONSTRAINT "PronunciationRuleExample_pkey" PRIMARY KEY (id);


--
-- Name: PronunciationRulePoint PronunciationRulePoint_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRulePoint"
    ADD CONSTRAINT "PronunciationRulePoint_pkey" PRIMARY KEY (id);


--
-- Name: PronunciationRuleSection PronunciationRuleSection_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRuleSection"
    ADD CONSTRAINT "PronunciationRuleSection_pkey" PRIMARY KEY (id);


--
-- Name: PronunciationRuleTip PronunciationRuleTip_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRuleTip"
    ADD CONSTRAINT "PronunciationRuleTip_pkey" PRIMARY KEY (id);


--
-- Name: PronunciationRulesMeta PronunciationRulesMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRulesMeta"
    ADD CONSTRAINT "PronunciationRulesMeta_pkey" PRIMARY KEY (id);


--
-- Name: PushDeviceToken PushDeviceToken_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PushDeviceToken"
    ADD CONSTRAINT "PushDeviceToken_pkey" PRIMARY KEY (id);


--
-- Name: ReadingAttempt ReadingAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingAttempt"
    ADD CONSTRAINT "ReadingAttempt_pkey" PRIMARY KEY (id);


--
-- Name: ReadingPassage ReadingPassage_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingPassage"
    ADD CONSTRAINT "ReadingPassage_pkey" PRIMARY KEY (id);


--
-- Name: ReadingQuestionOption ReadingQuestionOption_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingQuestionOption"
    ADD CONSTRAINT "ReadingQuestionOption_pkey" PRIMARY KEY (id);


--
-- Name: ReadingQuestion ReadingQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingQuestion"
    ADD CONSTRAINT "ReadingQuestion_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: RoleplayLine RoleplayLine_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."RoleplayLine"
    ADD CONSTRAINT "RoleplayLine_pkey" PRIMARY KEY (id);


--
-- Name: RoleplayScene RoleplayScene_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."RoleplayScene"
    ADD CONSTRAINT "RoleplayScene_pkey" PRIMARY KEY (id);


--
-- Name: SrsCard SrsCard_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SrsCard"
    ADD CONSTRAINT "SrsCard_pkey" PRIMARY KEY (id);


--
-- Name: StudySession StudySession_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."StudySession"
    ADD CONSTRAINT "StudySession_pkey" PRIMARY KEY (id);


--
-- Name: StudyStreak StudyStreak_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."StudyStreak"
    ADD CONSTRAINT "StudyStreak_pkey" PRIMARY KEY (id);


--
-- Name: StudyTip StudyTip_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."StudyTip"
    ADD CONSTRAINT "StudyTip_pkey" PRIMARY KEY (id);


--
-- Name: SubscriptionPlanConfig SubscriptionPlanConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SubscriptionPlanConfig"
    ADD CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: SupportMessage SupportMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SupportMessage"
    ADD CONSTRAINT "SupportMessage_pkey" PRIMARY KEY (id);


--
-- Name: SupportThread SupportThread_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SupportThread"
    ADD CONSTRAINT "SupportThread_pkey" PRIMARY KEY (id);


--
-- Name: TextbookBook TextbookBook_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."TextbookBook"
    ADD CONSTRAINT "TextbookBook_pkey" PRIMARY KEY (id);


--
-- Name: TextbookSeries TextbookSeries_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."TextbookSeries"
    ADD CONSTRAINT "TextbookSeries_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VocabSuffixGroup VocabSuffixGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabSuffixGroup"
    ADD CONSTRAINT "VocabSuffixGroup_pkey" PRIMARY KEY (id);


--
-- Name: VocabSuffixItem VocabSuffixItem_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabSuffixItem"
    ADD CONSTRAINT "VocabSuffixItem_pkey" PRIMARY KEY (id);


--
-- Name: VocabularyExample VocabularyExample_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabularyExample"
    ADD CONSTRAINT "VocabularyExample_pkey" PRIMARY KEY (id);


--
-- Name: VocabularyKanjiLink VocabularyKanjiLink_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabularyKanjiLink"
    ADD CONSTRAINT "VocabularyKanjiLink_pkey" PRIMARY KEY (id);


--
-- Name: Vocabulary Vocabulary_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Vocabulary"
    ADD CONSTRAINT "Vocabulary_pkey" PRIMARY KEY (id);


--
-- Name: WebhookEvent WebhookEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."WebhookEvent"
    ADD CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: flyway; Owner: nihongo
--

CREATE INDEX flyway_schema_history_s_idx ON flyway.flyway_schema_history USING btree (success);


--
-- Name: churn_risk_day_score_idx; Type: INDEX; Schema: insights; Owner: nihongo
--

CREATE INDEX churn_risk_day_score_idx ON insights.churn_risk USING btree (day, risk_score DESC);


--
-- Name: reengagement_user_day_idx; Type: INDEX; Schema: insights; Owner: nihongo
--

CREATE INDEX reengagement_user_day_idx ON insights.reengagement USING btree (user_id, day DESC);


--
-- Name: BookAudioDriveFolder_driveId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "BookAudioDriveFolder_driveId_key" ON public."BookAudioDriveFolder" USING btree ("driveId");


--
-- Name: BookAudioFile_folderId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "BookAudioFile_folderId_sortOrder_idx" ON public."BookAudioFile" USING btree ("folderId", "sortOrder");


--
-- Name: BookAudioFile_itemId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "BookAudioFile_itemId_sortOrder_idx" ON public."BookAudioFile" USING btree ("itemId", "sortOrder");


--
-- Name: BookAudioItem_driveId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "BookAudioItem_driveId_idx" ON public."BookAudioItem" USING btree ("driveId");


--
-- Name: BookAudioItem_externalKey_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "BookAudioItem_externalKey_key" ON public."BookAudioItem" USING btree ("externalKey");


--
-- Name: BookAudioItem_folderId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "BookAudioItem_folderId_idx" ON public."BookAudioItem" USING btree ("folderId");


--
-- Name: BookAudioItem_level_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "BookAudioItem_level_sortOrder_idx" ON public."BookAudioItem" USING btree (level, "sortOrder");


--
-- Name: ChatMessage_sessionId_createdAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON public."ChatMessage" USING btree ("sessionId", "createdAt");


--
-- Name: CoachAvailability_coachId_dayOfWeek_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CoachAvailability_coachId_dayOfWeek_idx" ON public."CoachAvailability" USING btree ("coachId", "dayOfWeek");


--
-- Name: CoachProfile_isActive_avgRating_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CoachProfile_isActive_avgRating_idx" ON public."CoachProfile" USING btree ("isActive", "avgRating");


--
-- Name: CoachProfile_isActive_hourlyRateUsd_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CoachProfile_isActive_hourlyRateUsd_idx" ON public."CoachProfile" USING btree ("isActive", "hourlyRateUsd");


--
-- Name: CoachProfile_stripeAccountId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "CoachProfile_stripeAccountId_key" ON public."CoachProfile" USING btree ("stripeAccountId");


--
-- Name: CoachProfile_userId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "CoachProfile_userId_key" ON public."CoachProfile" USING btree ("userId");


--
-- Name: CoachReview_coachId_rating_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CoachReview_coachId_rating_idx" ON public."CoachReview" USING btree ("coachId", rating);


--
-- Name: CoachReview_sessionId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "CoachReview_sessionId_key" ON public."CoachReview" USING btree ("sessionId");


--
-- Name: CoachingSession_coachId_scheduledAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CoachingSession_coachId_scheduledAt_idx" ON public."CoachingSession" USING btree ("coachId", "scheduledAt");


--
-- Name: CoachingSession_coachId_status_payoutId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CoachingSession_coachId_status_payoutId_idx" ON public."CoachingSession" USING btree ("coachId", status, "payoutId");


--
-- Name: CoachingSession_learnerId_scheduledAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CoachingSession_learnerId_scheduledAt_idx" ON public."CoachingSession" USING btree ("learnerId", "scheduledAt");


--
-- Name: CoachingSession_status_scheduledAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CoachingSession_status_scheduledAt_idx" ON public."CoachingSession" USING btree (status, "scheduledAt");


--
-- Name: ConversationIntroExample_slotId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ConversationIntroExample_slotId_sortOrder_idx" ON public."ConversationIntroExample" USING btree ("slotId", "sortOrder");


--
-- Name: ConversationIntroLine_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ConversationIntroLine_sortOrder_idx" ON public."ConversationIntroLine" USING btree ("sortOrder");


--
-- Name: ConversationIntroSlot_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ConversationIntroSlot_sortOrder_idx" ON public."ConversationIntroSlot" USING btree ("sortOrder");


--
-- Name: ConversationPhraseGroup_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "ConversationPhraseGroup_slug_key" ON public."ConversationPhraseGroup" USING btree (slug);


--
-- Name: ConversationPhraseGroup_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ConversationPhraseGroup_sortOrder_idx" ON public."ConversationPhraseGroup" USING btree ("sortOrder");


--
-- Name: ConversationPhraseItem_groupId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ConversationPhraseItem_groupId_sortOrder_idx" ON public."ConversationPhraseItem" USING btree ("groupId", "sortOrder");


--
-- Name: CounterCategory_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "CounterCategory_slug_key" ON public."CounterCategory" USING btree (slug);


--
-- Name: CounterItem_categoryId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CounterItem_categoryId_sortOrder_idx" ON public."CounterItem" USING btree ("categoryId", "sortOrder");


--
-- Name: CountryNameItem_regionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CountryNameItem_regionId_sortOrder_idx" ON public."CountryNameItem" USING btree ("regionId", "sortOrder");


--
-- Name: CountryRegion_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "CountryRegion_slug_key" ON public."CountryRegion" USING btree (slug);


--
-- Name: CountryRegion_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "CountryRegion_sortOrder_idx" ON public."CountryRegion" USING btree ("sortOrder");


--
-- Name: DailyActivity_userId_date_kind_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "DailyActivity_userId_date_kind_key" ON public."DailyActivity" USING btree ("userId", date, kind);


--
-- Name: DailyGoalItem_goalId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "DailyGoalItem_goalId_sortOrder_idx" ON public."DailyGoalItem" USING btree ("goalId", "sortOrder");


--
-- Name: DailyGoal_userId_date_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "DailyGoal_userId_date_key" ON public."DailyGoal" USING btree ("userId", date);


--
-- Name: DailyNote_userId_date_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "DailyNote_userId_date_key" ON public."DailyNote" USING btree ("userId", date);


--
-- Name: DictationAttempt_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "DictationAttempt_userId_createdAt_idx" ON public."DictationAttempt" USING btree ("userId", "createdAt");


--
-- Name: DictationAttempt_vocabId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "DictationAttempt_vocabId_idx" ON public."DictationAttempt" USING btree ("vocabId");


--
-- Name: EmailBroadcast_createdById_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EmailBroadcast_createdById_idx" ON public."EmailBroadcast" USING btree ("createdById");


--
-- Name: EmailBroadcast_status_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EmailBroadcast_status_idx" ON public."EmailBroadcast" USING btree (status);


--
-- Name: EmailPrefs_userId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "EmailPrefs_userId_key" ON public."EmailPrefs" USING btree ("userId");


--
-- Name: EmailTemplate_name_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "EmailTemplate_name_key" ON public."EmailTemplate" USING btree (name);


--
-- Name: EmailVerificationToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON public."EmailVerificationToken" USING btree ("expiresAt");


--
-- Name: EmailVerificationToken_tokenHash_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON public."EmailVerificationToken" USING btree ("tokenHash");


--
-- Name: EmailVerificationToken_userId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EmailVerificationToken_userId_idx" ON public."EmailVerificationToken" USING btree ("userId");


--
-- Name: EnglishKatakanaExample_sectionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EnglishKatakanaExample_sectionId_sortOrder_idx" ON public."EnglishKatakanaExample" USING btree ("sectionId", "sortOrder");


--
-- Name: EnglishKatakanaMapping_sectionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EnglishKatakanaMapping_sectionId_sortOrder_idx" ON public."EnglishKatakanaMapping" USING btree ("sectionId", "sortOrder");


--
-- Name: EnglishKatakanaPoint_sectionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EnglishKatakanaPoint_sectionId_sortOrder_idx" ON public."EnglishKatakanaPoint" USING btree ("sectionId", "sortOrder");


--
-- Name: EnglishKatakanaSection_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "EnglishKatakanaSection_slug_key" ON public."EnglishKatakanaSection" USING btree (slug);


--
-- Name: EnglishKatakanaSection_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EnglishKatakanaSection_sortOrder_idx" ON public."EnglishKatakanaSection" USING btree ("sortOrder");


--
-- Name: EnglishKatakanaTip_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "EnglishKatakanaTip_sortOrder_idx" ON public."EnglishKatakanaTip" USING btree ("sortOrder");


--
-- Name: ExamResult_level_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ExamResult_level_idx" ON public."ExamResult" USING btree (level);


--
-- Name: ExamResult_userId_submittedAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ExamResult_userId_submittedAt_idx" ON public."ExamResult" USING btree ("userId", "submittedAt");


--
-- Name: ExamSectionResult_examResultId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ExamSectionResult_examResultId_idx" ON public."ExamSectionResult" USING btree ("examResultId");


--
-- Name: ExerciseOption_exerciseId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ExerciseOption_exerciseId_sortOrder_idx" ON public."ExerciseOption" USING btree ("exerciseId", "sortOrder");


--
-- Name: Exercise_lessonId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Exercise_lessonId_sortOrder_idx" ON public."Exercise" USING btree ("lessonId", "sortOrder");


--
-- Name: Grammar_jlptLevel_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Grammar_jlptLevel_idx" ON public."Grammar" USING btree ("jlptLevel");


--
-- Name: Grammar_lessonId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Grammar_lessonId_sortOrder_idx" ON public."Grammar" USING btree ("lessonId", "sortOrder");


--
-- Name: HomeFeatureItem_sectionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "HomeFeatureItem_sectionId_sortOrder_idx" ON public."HomeFeatureItem" USING btree ("sectionId", "sortOrder");


--
-- Name: HomeFeatureSection_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "HomeFeatureSection_slug_key" ON public."HomeFeatureSection" USING btree (slug);


--
-- Name: HomeFeatureSection_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "HomeFeatureSection_sortOrder_idx" ON public."HomeFeatureSection" USING btree ("sortOrder");


--
-- Name: HomeStat_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "HomeStat_sortOrder_idx" ON public."HomeStat" USING btree ("sortOrder");


--
-- Name: JlptExamSession_externalKey_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "JlptExamSession_externalKey_key" ON public."JlptExamSession" USING btree ("externalKey");


--
-- Name: JlptRoadmapExamSection_levelId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "JlptRoadmapExamSection_levelId_sortOrder_idx" ON public."JlptRoadmapExamSection" USING btree ("levelId", "sortOrder");


--
-- Name: JlptRoadmapLevel_externalKey_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "JlptRoadmapLevel_externalKey_key" ON public."JlptRoadmapLevel" USING btree ("externalKey");


--
-- Name: JlptRoadmapMaterial_levelId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "JlptRoadmapMaterial_levelId_sortOrder_idx" ON public."JlptRoadmapMaterial" USING btree ("levelId", "sortOrder");


--
-- Name: JlptRoadmapPhase_levelId_externalKey_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "JlptRoadmapPhase_levelId_externalKey_key" ON public."JlptRoadmapPhase" USING btree ("levelId", "externalKey");


--
-- Name: JlptRoadmapPhase_levelId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "JlptRoadmapPhase_levelId_sortOrder_idx" ON public."JlptRoadmapPhase" USING btree ("levelId", "sortOrder");


--
-- Name: JlptRoadmapTask_phaseId_externalKey_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "JlptRoadmapTask_phaseId_externalKey_key" ON public."JlptRoadmapTask" USING btree ("phaseId", "externalKey");


--
-- Name: JlptRoadmapTask_phaseId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "JlptRoadmapTask_phaseId_sortOrder_idx" ON public."JlptRoadmapTask" USING btree ("phaseId", "sortOrder");


--
-- Name: KanaCell_sectionId_rowIndex_colIndex_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "KanaCell_sectionId_rowIndex_colIndex_key" ON public."KanaCell" USING btree ("sectionId", "rowIndex", "colIndex");


--
-- Name: KanaRomaji_kana_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "KanaRomaji_kana_key" ON public."KanaRomaji" USING btree (kana);


--
-- Name: KanaSection_script_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "KanaSection_script_slug_key" ON public."KanaSection" USING btree (script, slug);


--
-- Name: KanaSection_script_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "KanaSection_script_sortOrder_idx" ON public."KanaSection" USING btree (script, "sortOrder");


--
-- Name: KanjiEntry_character_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "KanjiEntry_character_idx" ON public."KanjiEntry" USING btree ("character");


--
-- Name: KanjiEntry_jlptLevel_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "KanjiEntry_jlptLevel_idx" ON public."KanjiEntry" USING btree ("jlptLevel");


--
-- Name: KanjiEntry_lessonId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "KanjiEntry_lessonId_sortOrder_idx" ON public."KanjiEntry" USING btree ("lessonId", "sortOrder");


--
-- Name: KanjiLesson_jlptLevel_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "KanjiLesson_jlptLevel_sortOrder_idx" ON public."KanjiLesson" USING btree ("jlptLevel", "sortOrder");


--
-- Name: KanjiLesson_lessonNumber_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "KanjiLesson_lessonNumber_key" ON public."KanjiLesson" USING btree ("lessonNumber");


--
-- Name: KanjiLesson_textbook_lessonNumber_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "KanjiLesson_textbook_lessonNumber_idx" ON public."KanjiLesson" USING btree (textbook, "lessonNumber");


--
-- Name: KanjiVocab_kanjiEntryId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "KanjiVocab_kanjiEntryId_sortOrder_idx" ON public."KanjiVocab" USING btree ("kanjiEntryId", "sortOrder");


--
-- Name: KanjiVocab_vocabularyId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "KanjiVocab_vocabularyId_idx" ON public."KanjiVocab" USING btree ("vocabularyId");


--
-- Name: LearnerChatMember_roomId_userId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "LearnerChatMember_roomId_userId_key" ON public."LearnerChatMember" USING btree ("roomId", "userId");


--
-- Name: LearnerChatMember_userId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "LearnerChatMember_userId_idx" ON public."LearnerChatMember" USING btree ("userId");


--
-- Name: LearnerChatMessage_roomId_createdAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "LearnerChatMessage_roomId_createdAt_idx" ON public."LearnerChatMessage" USING btree ("roomId", "createdAt");


--
-- Name: LearnerChatRoom_lastMessageAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "LearnerChatRoom_lastMessageAt_idx" ON public."LearnerChatRoom" USING btree ("lastMessageAt");


--
-- Name: LearnerChatRoom_type_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "LearnerChatRoom_type_idx" ON public."LearnerChatRoom" USING btree (type);


--
-- Name: Lesson_jlptLevel_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Lesson_jlptLevel_sortOrder_idx" ON public."Lesson" USING btree ("jlptLevel", "sortOrder");


--
-- Name: Lesson_lessonNumber_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "Lesson_lessonNumber_key" ON public."Lesson" USING btree ("lessonNumber");


--
-- Name: Lesson_textbook_lessonNumber_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Lesson_textbook_lessonNumber_idx" ON public."Lesson" USING btree (textbook, "lessonNumber");


--
-- Name: ListeningPreset_externalKey_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "ListeningPreset_externalKey_key" ON public."ListeningPreset" USING btree ("externalKey");


--
-- Name: LiveSession_coachId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "LiveSession_coachId_idx" ON public."LiveSession" USING btree ("coachId");


--
-- Name: LiveSession_roomName_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "LiveSession_roomName_key" ON public."LiveSession" USING btree ("roomName");


--
-- Name: LiveSession_status_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "LiveSession_status_idx" ON public."LiveSession" USING btree (status);


--
-- Name: MindMapLevel_kind_level_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "MindMapLevel_kind_level_key" ON public."MindMapLevel" USING btree (kind, level);


--
-- Name: MindMapLevel_kind_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "MindMapLevel_kind_sortOrder_idx" ON public."MindMapLevel" USING btree (kind, "sortOrder");


--
-- Name: MockExamQuestionOption_questionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "MockExamQuestionOption_questionId_sortOrder_idx" ON public."MockExamQuestionOption" USING btree ("questionId", "sortOrder");


--
-- Name: MockExamQuestion_templateId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "MockExamQuestion_templateId_sortOrder_idx" ON public."MockExamQuestion" USING btree ("templateId", "sortOrder");


--
-- Name: MockExamTemplate_isPublished_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "MockExamTemplate_isPublished_sortOrder_idx" ON public."MockExamTemplate" USING btree ("isPublished", "sortOrder");


--
-- Name: MockExamTemplate_level_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "MockExamTemplate_level_sortOrder_idx" ON public."MockExamTemplate" USING btree (level, "sortOrder");


--
-- Name: MockExamTemplate_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "MockExamTemplate_slug_key" ON public."MockExamTemplate" USING btree (slug);


--
-- Name: Notification_userId_readAt_createdAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON public."Notification" USING btree ("userId", "readAt", "createdAt");


--
-- Name: OutboxEvent_publishedAt_id_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "OutboxEvent_publishedAt_id_idx" ON public."OutboxEvent" USING btree ("publishedAt", id);


--
-- Name: PageBanner_path_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "PageBanner_path_key" ON public."PageBanner" USING btree (path);


--
-- Name: PasswordResetToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "PasswordResetToken_expiresAt_idx" ON public."PasswordResetToken" USING btree ("expiresAt");


--
-- Name: PasswordResetToken_tokenHash_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON public."PasswordResetToken" USING btree ("tokenHash");


--
-- Name: PasswordResetToken_userId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "PasswordResetToken_userId_idx" ON public."PasswordResetToken" USING btree ("userId");


--
-- Name: Payment_sessionId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "Payment_sessionId_key" ON public."Payment" USING btree ("sessionId");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Payment_stripePaymentIntentId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON public."Payment" USING btree ("stripePaymentIntentId");


--
-- Name: Payment_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Payment_userId_createdAt_idx" ON public."Payment" USING btree ("userId", "createdAt");


--
-- Name: Payout_coachId_status_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Payout_coachId_status_idx" ON public."Payout" USING btree ("coachId", status);


--
-- Name: Payout_periodStart_periodEnd_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Payout_periodStart_periodEnd_idx" ON public."Payout" USING btree ("periodStart", "periodEnd");


--
-- Name: Payout_stripeTransferId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "Payout_stripeTransferId_key" ON public."Payout" USING btree ("stripeTransferId");


--
-- Name: PodcastResource_externalKey_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "PodcastResource_externalKey_key" ON public."PodcastResource" USING btree ("externalKey");


--
-- Name: PronunciationRuleExample_sectionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "PronunciationRuleExample_sectionId_sortOrder_idx" ON public."PronunciationRuleExample" USING btree ("sectionId", "sortOrder");


--
-- Name: PronunciationRulePoint_sectionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "PronunciationRulePoint_sectionId_sortOrder_idx" ON public."PronunciationRulePoint" USING btree ("sectionId", "sortOrder");


--
-- Name: PronunciationRuleSection_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "PronunciationRuleSection_slug_key" ON public."PronunciationRuleSection" USING btree (slug);


--
-- Name: PronunciationRuleSection_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "PronunciationRuleSection_sortOrder_idx" ON public."PronunciationRuleSection" USING btree ("sortOrder");


--
-- Name: PronunciationRuleTip_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "PronunciationRuleTip_sortOrder_idx" ON public."PronunciationRuleTip" USING btree ("sortOrder");


--
-- Name: PushDeviceToken_token_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "PushDeviceToken_token_key" ON public."PushDeviceToken" USING btree (token);


--
-- Name: PushDeviceToken_userId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "PushDeviceToken_userId_idx" ON public."PushDeviceToken" USING btree ("userId");


--
-- Name: ReadingAttempt_passageId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ReadingAttempt_passageId_idx" ON public."ReadingAttempt" USING btree ("passageId");


--
-- Name: ReadingAttempt_userId_submittedAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ReadingAttempt_userId_submittedAt_idx" ON public."ReadingAttempt" USING btree ("userId", "submittedAt");


--
-- Name: ReadingPassage_jlptLevel_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ReadingPassage_jlptLevel_sortOrder_idx" ON public."ReadingPassage" USING btree ("jlptLevel", "sortOrder");


--
-- Name: ReadingQuestionOption_questionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ReadingQuestionOption_questionId_sortOrder_idx" ON public."ReadingQuestionOption" USING btree ("questionId", "sortOrder");


--
-- Name: ReadingQuestion_passageId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "ReadingQuestion_passageId_sortOrder_idx" ON public."ReadingQuestion" USING btree ("passageId", "sortOrder");


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: RefreshToken_userId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "RefreshToken_userId_idx" ON public."RefreshToken" USING btree ("userId");


--
-- Name: RoleplayLine_sceneId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "RoleplayLine_sceneId_sortOrder_idx" ON public."RoleplayLine" USING btree ("sceneId", "sortOrder");


--
-- Name: RoleplayScene_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "RoleplayScene_slug_key" ON public."RoleplayScene" USING btree (slug);


--
-- Name: RoleplayScene_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "RoleplayScene_sortOrder_idx" ON public."RoleplayScene" USING btree ("sortOrder");


--
-- Name: SrsCard_userId_contentType_contentId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "SrsCard_userId_contentType_contentId_key" ON public."SrsCard" USING btree ("userId", "contentType", "contentId");


--
-- Name: SrsCard_userId_contentType_mastered_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "SrsCard_userId_contentType_mastered_idx" ON public."SrsCard" USING btree ("userId", "contentType", mastered);


--
-- Name: SrsCard_userId_nextReviewAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "SrsCard_userId_nextReviewAt_idx" ON public."SrsCard" USING btree ("userId", "nextReviewAt");


--
-- Name: StudySession_userId_date_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "StudySession_userId_date_key" ON public."StudySession" USING btree ("userId", date);


--
-- Name: StudyStreak_userId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "StudyStreak_userId_key" ON public."StudyStreak" USING btree ("userId");


--
-- Name: SubscriptionPlanConfig_plan_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "SubscriptionPlanConfig_plan_key" ON public."SubscriptionPlanConfig" USING btree (plan);


--
-- Name: Subscription_status_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Subscription_status_idx" ON public."Subscription" USING btree (status);


--
-- Name: Subscription_stripeCustomerId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Subscription_stripeCustomerId_idx" ON public."Subscription" USING btree ("stripeCustomerId");


--
-- Name: Subscription_stripeSubscriptionId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON public."Subscription" USING btree ("stripeSubscriptionId");


--
-- Name: Subscription_userId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "Subscription_userId_key" ON public."Subscription" USING btree ("userId");


--
-- Name: SupportMessage_threadId_createdAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "SupportMessage_threadId_createdAt_idx" ON public."SupportMessage" USING btree ("threadId", "createdAt");


--
-- Name: SupportThread_lastMessageAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "SupportThread_lastMessageAt_idx" ON public."SupportThread" USING btree ("lastMessageAt");


--
-- Name: SupportThread_userId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "SupportThread_userId_key" ON public."SupportThread" USING btree ("userId");


--
-- Name: TextbookBook_seriesId_level_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "TextbookBook_seriesId_level_sortOrder_idx" ON public."TextbookBook" USING btree ("seriesId", level, "sortOrder");


--
-- Name: TextbookSeries_code_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "TextbookSeries_code_key" ON public."TextbookSeries" USING btree (code);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_googleId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "User_googleId_key" ON public."User" USING btree ("googleId");


--
-- Name: User_keycloakId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "User_keycloakId_key" ON public."User" USING btree ("keycloakId");


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: VocabSuffixGroup_slug_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "VocabSuffixGroup_slug_key" ON public."VocabSuffixGroup" USING btree (slug);


--
-- Name: VocabSuffixGroup_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "VocabSuffixGroup_sortOrder_idx" ON public."VocabSuffixGroup" USING btree ("sortOrder");


--
-- Name: VocabSuffixItem_groupId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "VocabSuffixItem_groupId_sortOrder_idx" ON public."VocabSuffixItem" USING btree ("groupId", "sortOrder");


--
-- Name: VocabularyExample_vocabularyId_sortOrder_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "VocabularyExample_vocabularyId_sortOrder_key" ON public."VocabularyExample" USING btree ("vocabularyId", "sortOrder");


--
-- Name: VocabularyKanjiLink_kanjiEntryId_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "VocabularyKanjiLink_kanjiEntryId_idx" ON public."VocabularyKanjiLink" USING btree ("kanjiEntryId");


--
-- Name: VocabularyKanjiLink_vocabularyId_kanjiEntryId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "VocabularyKanjiLink_vocabularyId_kanjiEntryId_key" ON public."VocabularyKanjiLink" USING btree ("vocabularyId", "kanjiEntryId");


--
-- Name: Vocabulary_jlptLevel_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Vocabulary_jlptLevel_idx" ON public."Vocabulary" USING btree ("jlptLevel");


--
-- Name: Vocabulary_lessonId_sortOrder_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "Vocabulary_lessonId_sortOrder_idx" ON public."Vocabulary" USING btree ("lessonId", "sortOrder");


--
-- Name: WebhookEvent_eventId_key; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON public."WebhookEvent" USING btree ("eventId");


--
-- Name: WebhookEvent_eventType_status_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "WebhookEvent_eventType_status_idx" ON public."WebhookEvent" USING btree ("eventType", status);


--
-- Name: WebhookEvent_provider_status_createdAt_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE INDEX "WebhookEvent_provider_status_createdAt_idx" ON public."WebhookEvent" USING btree (provider, status, "createdAt");


--
-- Name: learner_progress_summary_user_idx; Type: INDEX; Schema: public; Owner: nihongo
--

CREATE UNIQUE INDEX learner_progress_summary_user_idx ON public.learner_progress_summary USING btree ("userId");


--
-- Name: BookAudioFile BookAudioFile_folderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioFile"
    ADD CONSTRAINT "BookAudioFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public."BookAudioDriveFolder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookAudioFile BookAudioFile_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioFile"
    ADD CONSTRAINT "BookAudioFile_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."BookAudioItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookAudioItem BookAudioItem_folderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."BookAudioItem"
    ADD CONSTRAINT "BookAudioItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public."BookAudioDriveFolder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatMessage ChatMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ChatMessage ChatMessage_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."CoachingSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CoachAvailability CoachAvailability_coachId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachAvailability"
    ADD CONSTRAINT "CoachAvailability_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES public."CoachProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CoachProfile CoachProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachProfile"
    ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CoachReview CoachReview_coachId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachReview"
    ADD CONSTRAINT "CoachReview_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES public."CoachProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CoachReview CoachReview_learnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachReview"
    ADD CONSTRAINT "CoachReview_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CoachReview CoachReview_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachReview"
    ADD CONSTRAINT "CoachReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."CoachingSession"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CoachingSession CoachingSession_coachId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachingSession"
    ADD CONSTRAINT "CoachingSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES public."CoachProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CoachingSession CoachingSession_learnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachingSession"
    ADD CONSTRAINT "CoachingSession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CoachingSession CoachingSession_payoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CoachingSession"
    ADD CONSTRAINT "CoachingSession_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES public."Payout"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConversationIntroExample ConversationIntroExample_slotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationIntroExample"
    ADD CONSTRAINT "ConversationIntroExample_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES public."ConversationIntroSlot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConversationPhraseItem ConversationPhraseItem_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ConversationPhraseItem"
    ADD CONSTRAINT "ConversationPhraseItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."ConversationPhraseGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CounterItem CounterItem_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CounterItem"
    ADD CONSTRAINT "CounterItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."CounterCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CountryNameItem CountryNameItem_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."CountryNameItem"
    ADD CONSTRAINT "CountryNameItem_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."CountryRegion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyActivity DailyActivity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyActivity"
    ADD CONSTRAINT "DailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyGoalItem DailyGoalItem_goalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyGoalItem"
    ADD CONSTRAINT "DailyGoalItem_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES public."DailyGoal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyGoal DailyGoal_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyGoal"
    ADD CONSTRAINT "DailyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyNote DailyNote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DailyNote"
    ADD CONSTRAINT "DailyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DictationAttempt DictationAttempt_vocabId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."DictationAttempt"
    ADD CONSTRAINT "DictationAttempt_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES public."Vocabulary"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmailPrefs EmailPrefs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EmailPrefs"
    ADD CONSTRAINT "EmailPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmailVerificationToken EmailVerificationToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EnglishKatakanaExample EnglishKatakanaExample_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaExample"
    ADD CONSTRAINT "EnglishKatakanaExample_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."EnglishKatakanaSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EnglishKatakanaMapping EnglishKatakanaMapping_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaMapping"
    ADD CONSTRAINT "EnglishKatakanaMapping_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."EnglishKatakanaSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EnglishKatakanaPoint EnglishKatakanaPoint_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."EnglishKatakanaPoint"
    ADD CONSTRAINT "EnglishKatakanaPoint_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."EnglishKatakanaSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamResult ExamResult_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExamResult"
    ADD CONSTRAINT "ExamResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ExamSectionResult ExamSectionResult_examResultId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExamSectionResult"
    ADD CONSTRAINT "ExamSectionResult_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES public."ExamResult"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Example Example_grammarId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Example"
    ADD CONSTRAINT "Example_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES public."Grammar"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExerciseOption ExerciseOption_exerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ExerciseOption"
    ADD CONSTRAINT "ExerciseOption_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES public."Exercise"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Exercise Exercise_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Exercise"
    ADD CONSTRAINT "Exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public."Lesson"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Grammar Grammar_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Grammar"
    ADD CONSTRAINT "Grammar_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public."Lesson"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HomeFeatureItem HomeFeatureItem_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."HomeFeatureItem"
    ADD CONSTRAINT "HomeFeatureItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."HomeFeatureSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JlptRoadmapExamSection JlptRoadmapExamSection_levelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapExamSection"
    ADD CONSTRAINT "JlptRoadmapExamSection_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES public."JlptRoadmapLevel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JlptRoadmapMaterial JlptRoadmapMaterial_levelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapMaterial"
    ADD CONSTRAINT "JlptRoadmapMaterial_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES public."JlptRoadmapLevel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JlptRoadmapPhase JlptRoadmapPhase_levelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapPhase"
    ADD CONSTRAINT "JlptRoadmapPhase_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES public."JlptRoadmapLevel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JlptRoadmapTask JlptRoadmapTask_phaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."JlptRoadmapTask"
    ADD CONSTRAINT "JlptRoadmapTask_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES public."JlptRoadmapPhase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KanaCell KanaCell_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanaCell"
    ADD CONSTRAINT "KanaCell_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."KanaSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KanjiEntry KanjiEntry_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiEntry"
    ADD CONSTRAINT "KanjiEntry_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public."KanjiLesson"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KanjiVocab KanjiVocab_kanjiEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiVocab"
    ADD CONSTRAINT "KanjiVocab_kanjiEntryId_fkey" FOREIGN KEY ("kanjiEntryId") REFERENCES public."KanjiEntry"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KanjiVocab KanjiVocab_vocabularyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."KanjiVocab"
    ADD CONSTRAINT "KanjiVocab_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES public."Vocabulary"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LearnerChatMember LearnerChatMember_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatMember"
    ADD CONSTRAINT "LearnerChatMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."LearnerChatRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LearnerChatMember LearnerChatMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatMember"
    ADD CONSTRAINT "LearnerChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LearnerChatMessage LearnerChatMessage_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatMessage"
    ADD CONSTRAINT "LearnerChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."LearnerChatRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LearnerChatMessage LearnerChatMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatMessage"
    ADD CONSTRAINT "LearnerChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LearnerChatRoom LearnerChatRoom_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LearnerChatRoom"
    ADD CONSTRAINT "LearnerChatRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ListeningLog ListeningLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ListeningLog"
    ADD CONSTRAINT "ListeningLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LiveSession LiveSession_coachId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."LiveSession"
    ADD CONSTRAINT "LiveSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MockExamQuestionOption MockExamQuestionOption_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MockExamQuestionOption"
    ADD CONSTRAINT "MockExamQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."MockExamQuestion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MockExamQuestion MockExamQuestion_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."MockExamQuestion"
    ADD CONSTRAINT "MockExamQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."MockExamTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PasswordResetToken PasswordResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."CoachingSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_subscriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payout Payout_coachId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Payout"
    ADD CONSTRAINT "Payout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES public."CoachProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PronunciationRuleExample PronunciationRuleExample_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRuleExample"
    ADD CONSTRAINT "PronunciationRuleExample_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."PronunciationRuleSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PronunciationRulePoint PronunciationRulePoint_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PronunciationRulePoint"
    ADD CONSTRAINT "PronunciationRulePoint_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."PronunciationRuleSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PushDeviceToken PushDeviceToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."PushDeviceToken"
    ADD CONSTRAINT "PushDeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReadingAttempt ReadingAttempt_passageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingAttempt"
    ADD CONSTRAINT "ReadingAttempt_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES public."ReadingPassage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReadingQuestionOption ReadingQuestionOption_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingQuestionOption"
    ADD CONSTRAINT "ReadingQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."ReadingQuestion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReadingQuestion ReadingQuestion_passageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."ReadingQuestion"
    ADD CONSTRAINT "ReadingQuestion_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES public."ReadingPassage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoleplayLine RoleplayLine_sceneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."RoleplayLine"
    ADD CONSTRAINT "RoleplayLine_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES public."RoleplayScene"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SrsCard SrsCard_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SrsCard"
    ADD CONSTRAINT "SrsCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudySession StudySession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."StudySession"
    ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudyStreak StudyStreak_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."StudyStreak"
    ADD CONSTRAINT "StudyStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Subscription Subscription_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SupportMessage SupportMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SupportMessage"
    ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SupportMessage SupportMessage_threadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SupportMessage"
    ADD CONSTRAINT "SupportMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES public."SupportThread"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SupportThread SupportThread_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."SupportThread"
    ADD CONSTRAINT "SupportThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TextbookBook TextbookBook_seriesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."TextbookBook"
    ADD CONSTRAINT "TextbookBook_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES public."TextbookSeries"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VocabSuffixItem VocabSuffixItem_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabSuffixItem"
    ADD CONSTRAINT "VocabSuffixItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."VocabSuffixGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VocabularyExample VocabularyExample_vocabularyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabularyExample"
    ADD CONSTRAINT "VocabularyExample_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES public."Vocabulary"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VocabularyKanjiLink VocabularyKanjiLink_kanjiEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabularyKanjiLink"
    ADD CONSTRAINT "VocabularyKanjiLink_kanjiEntryId_fkey" FOREIGN KEY ("kanjiEntryId") REFERENCES public."KanjiEntry"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VocabularyKanjiLink VocabularyKanjiLink_vocabularyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."VocabularyKanjiLink"
    ADD CONSTRAINT "VocabularyKanjiLink_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES public."Vocabulary"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vocabulary Vocabulary_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nihongo
--

ALTER TABLE ONLY public."Vocabulary"
    ADD CONSTRAINT "Vocabulary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public."Lesson"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 7CPvBn7mnbAVWwJjfChMd6J4364JhOzLmoLA4KmRJwrPb93EUjtQqqtgGK0qXh6

