import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeContext';
import {
  ConfirmationRequest,
  resolveConfirmation,
  subscribeToConfirmations,
} from '../utils/confirm';

export const ConfirmationDialog = () => {
  const { theme } = useTheme();
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);

  useEffect(() => subscribeToConfirmations(setRequest), []);

  return (
    <Modal
      transparent
      visible={Boolean(request)}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => resolveConfirmation(false)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close confirmation"
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={() => resolveConfirmation(false)}
      >
        <Pressable
          accessibilityRole="alert"
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.panelStrong,
              borderColor: theme.colors.border,
              ...theme.shadows.floating,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor: request?.destructive
                    ? `${theme.colors.status.error}18`
                    : `${theme.colors.primary}18`,
                },
              ]}
            >
              <AlertTriangle
                size={21}
                color={request?.destructive ? theme.colors.status.error : theme.colors.primary}
              />
            </View>

            <View style={styles.headingCopy}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                {request?.title}
              </Text>
              <Text style={[styles.message, { color: theme.colors.text.secondary }]}>
                {request?.message}
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={styles.closeButton}
              onPress={() => resolveConfirmation(false)}
            >
              <X size={19} color={theme.colors.text.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceRaised,
                },
              ]}
              onPress={() => resolveConfirmation(false)}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: request?.destructive
                    ? theme.colors.status.error
                    : theme.colors.primary,
                },
              ]}
              onPress={() => resolveConfirmation(true)}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {request?.confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 8,
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    marginRight: -7,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },
  button: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
