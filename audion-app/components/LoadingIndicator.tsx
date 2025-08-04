import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type LoadingSize = 'small' | 'medium' | 'large';
export type LoadingVariant = 'fullscreen' | 'inline' | 'button';

interface LoadingIndicatorProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  text?: string;
  color?: string;
  style?: ViewStyle;
  testID?: string;
}

const getSizeValue = (size: LoadingSize): "small" | "large" | number => {
  switch (size) {
    case 'small': return 16;
    case 'medium': return 20;
    case 'large': return 'large';
    default: return 'large';
  }
};

export default function LoadingIndicator({
  size = 'large',
  variant = 'fullscreen',
  text,
  color,
  style,
  testID = 'loading-indicator',
}: LoadingIndicatorProps) {
  const { theme } = useTheme();
  
  const indicatorColor = color || theme.primary;
  const indicatorSize = getSizeValue(size);

  const renderContent = () => (
    <>
      <ActivityIndicator 
        size={indicatorSize} 
        color={indicatorColor}
        testID={`${testID}-spinner`}
      />
      {text && (
        <Text 
          style={[
            styles.loadingText, 
            { color: variant === 'button' ? '#fff' : theme.textSecondary }
          ]}
          testID={`${testID}-text`}
        >
          {text}
        </Text>
      )}
    </>
  );

  if (variant === 'fullscreen') {
    return (
      <View 
        style={[
          styles.fullscreenContainer, 
          { backgroundColor: theme.background },
          style
        ]}
        testID={testID}
      >
        {renderContent()}
      </View>
    );
  }

  if (variant === 'button') {
    return (
      <View 
        style={[styles.buttonContainer, style]}
        testID={testID}
      >
        {renderContent()}
      </View>
    );
  }

  // inline variant
  return (
    <View 
      style={[styles.inlineContainer, style]}
      testID={testID}
    >
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});