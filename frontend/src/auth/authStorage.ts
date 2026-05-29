import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

export const storageGetItem = async (key: string) => {
  if (isWeb) {
    return Promise.resolve(localStorage.getItem(key));
  }
  return AsyncStorage.getItem(key);
};

export const storageSetItem = async (key: string, value: string) => {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
};

export const storageRemoveItem = async (key: string) => {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
};
