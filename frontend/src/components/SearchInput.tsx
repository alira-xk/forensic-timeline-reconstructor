import React from 'react';
import { Search } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Input } from './Input';
import { useTheme } from '../theme/ThemeContext';

type SearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  placeholder,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={styles.icon}>
        <Search size={17} color={theme.colors.text.secondary} />
      </View>
      <Input
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        containerStyle={styles.inputContainer}
        style={styles.input}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  icon: {
    position: 'absolute',
    left: 15,
    top: 16,
    zIndex: 2,
  },
  input: {
    paddingLeft: 42,
  },
  inputContainer: {
    marginBottom: 0,
  },
});
