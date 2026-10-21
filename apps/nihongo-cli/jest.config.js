module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // Các gói này phát hành mã ESM: phải để Babel biên dịch (mặc định jest bỏ qua node_modules)
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@shopify|@stripe)/)',
  ],
};
