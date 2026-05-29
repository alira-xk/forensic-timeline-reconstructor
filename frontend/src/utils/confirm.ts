import { Alert, Platform } from 'react-native';

export const confirmDialog = (title: string, message: string) => {
  return new Promise<boolean>((resolve) => {
    if (Platform.OS === 'web') {
      // Fallback to native browser confirm on web
      try {
        const ok = window.confirm(message);
        resolve(Boolean(ok));
      } catch (e) {
        // If window.confirm unavailable, resolve false
        resolve(false);
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
};
