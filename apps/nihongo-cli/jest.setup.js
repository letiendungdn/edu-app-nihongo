/* Mock các native module: jest chạy trên Node, không có phần native của iOS/Android. */
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
jest.mock('@stripe/stripe-react-native', () =>
  require('@stripe/stripe-react-native/jest/mock.js'),
);
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => {
    const data = new Map();
    return {
      getString: key => data.get(key),
      set: (key, value) => data.set(key, value),
      delete: key => data.delete(key),
    };
  }),
}));
jest.mock('@op-engineering/op-sqlite', () => ({
  // Smoke test chỉ cần mở được; test tầng DB dùng SQL thật qua node:sqlite (src/db/__tests__)
  open: jest.fn(() => ({
    execute: jest.fn(async () => ({rows: []})),
    transaction: jest.fn(async fn => fn({execute: jest.fn(async () => ({rows: []}))})),
    close: jest.fn(),
  })),
}));
jest.mock('react-native-app-auth', () => ({authorize: jest.fn()}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn()},
  statusCodes: {},
  isErrorWithCode: () => false,
}));
