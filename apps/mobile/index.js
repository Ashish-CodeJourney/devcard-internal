// Installs crypto.getRandomValues, which PKCE needs and Hermes does not provide.
// Must be imported before anything that generates a code verifier.
import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
