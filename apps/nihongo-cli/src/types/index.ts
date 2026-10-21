export type Vocab = {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  level: string;
  srsInterval: number;
  srsDue: string | null;
};

export type User = {
  id: number;
  email: string;
  name: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type SrsReviewCard = {
  vocabId: number;
  word: string;
  reading: string;
  meaning: string;
  currentInterval: number;
};

export type RootStackParamList = {
  Main: undefined;
  VocabDetail: { id: number; word: string };
  Login: undefined;
  Premium: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Vocab: undefined;
  Review: undefined;
  Profile: undefined;
};
