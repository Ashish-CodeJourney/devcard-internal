module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Single React copy for tests: the workspace root also hosts react (for the
  // web app), so force every 'react' import in this suite to the mobile copy.
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((react-native|@react-native|@react-navigation|@gorhom)/|\\.pnpm/(react-native|@react-native|@react-navigation|@gorhom)[^/]*))',
  ],
};
