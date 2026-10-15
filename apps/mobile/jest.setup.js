/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

global.__reanimatedWorkletInit = () => {};

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    BottomSheetModalProvider: ({ children }) => <>{children}</>,
    BottomSheetModal: React.forwardRef(({ children }, _ref) => <>{children}</>),
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }) => <>{children}</>,
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-qrcode-svg', () => 'QRCode');

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native-camera-kit', () => ({
  Camera: 'Camera',
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

// react-native-svg has no bundled Jest mock; render its primitives as views.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const primitive = name => props => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: primitive('Svg'),
    Svg: primitive('Svg'),
    Defs: primitive('Defs'),
    LinearGradient: primitive('LinearGradient'),
    RadialGradient: primitive('RadialGradient'),
    Stop: primitive('Stop'),
    Rect: primitive('Rect'),
    Circle: primitive('Circle'),
    Ellipse: primitive('Ellipse'),
    G: primitive('G'),
    Path: primitive('Path'),
    Line: primitive('Line'),
    Polygon: primitive('Polygon'),
    Text: primitive('SvgText'),
  };
});

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: (Component) => Component,
  },
  createAnimatedComponent: (Component) => Component,
  useSharedValue: (value) => ({ value }),
  useAnimatedStyle: () => ({}),
  withTiming: (value) => value,
  withSpring: (value) => value,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  Easing: {},
}));

try {
  require.resolve('react-native/Libraries/Animated/NativeAnimatedHelper');
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // Module path changed in newer React Native versions.
}
