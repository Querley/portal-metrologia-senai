declare module 'react-native' {
  import type * as React from 'react';

  export type StyleProp<T> =
    | T
    | Record<string, unknown>
    | null
    | undefined
    | false
    | Array<StyleProp<T>>;

  export interface ViewProps {
    style?: StyleProp<Record<string, unknown>>;
    nativeID?: string;
    children?: React.ReactNode;
    onLayout?: (e: { nativeEvent: { layout: { width: number; height: number } } }) => void;
    onStartShouldSetResponder?: () => boolean;
    onMoveShouldSetResponder?: () => boolean;
    onResponderGrant?: (e: { nativeEvent: { locationX: number } }) => void;
    onResponderMove?: (e: { nativeEvent: { locationX: number } }) => void;
    onResponderRelease?: () => void;
  }

  export interface TextProps {
    style?: StyleProp<Record<string, unknown>>;
    numberOfLines?: number;
    children?: React.ReactNode;
  }

  export interface TextInputProps {
    style?: StyleProp<Record<string, unknown>>;
    value?: string;
    onChangeText?: (text: string) => void;
    onSubmitEditing?: () => void;
    placeholder?: string;
    placeholderTextColor?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    multiline?: boolean;
  }

  export interface TouchableOpacityProps {
    style?: StyleProp<Record<string, unknown>>;
    onPress?: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
  }

  export interface ScrollViewProps {
    style?: StyleProp<Record<string, unknown>>;
    contentContainerStyle?: StyleProp<Record<string, unknown>>;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    children?: React.ReactNode;
  }

  export interface ImageProps {
    source: { uri: string } | string;
    style?: StyleProp<Record<string, unknown>>;
    resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
    accessibilityLabel?: string;
  }

  export interface ModalProps {
    visible?: boolean;
    transparent?: boolean;
    animationType?: 'none' | 'slide' | 'fade';
    onRequestClose?: () => void;
    children?: React.ReactNode;
  }

  export interface StatusBarProps {
    barStyle?: 'default' | 'light-content' | 'dark-content';
    backgroundColor?: string;
  }

  export const View: React.ComponentType<ViewProps>;
  export const SafeAreaView: React.ComponentType<ViewProps>;
  export const Text: React.ComponentType<TextProps>;
  export const TextInput: React.ComponentType<TextInputProps>;
  export const TouchableOpacity: React.ComponentType<TouchableOpacityProps>;
  export const ScrollView: React.ComponentType<ScrollViewProps>;
  export const Image: React.ComponentType<ImageProps>;
  export const Modal: React.ComponentType<ModalProps>;
  export const StatusBar: React.ComponentType<StatusBarProps>;

  export const StyleSheet: {
    create<T extends Record<string, Record<string, unknown>>>(styles: T): T;
  };

  export const Linking: {
    canOpenURL(url: string): Promise<boolean>;
    openURL(url: string): Promise<void>;
  };
}

declare module 'expo' {
  import type * as React from 'react';
  export function registerRootComponent<P>(component: React.ComponentType<P>): void;
}
