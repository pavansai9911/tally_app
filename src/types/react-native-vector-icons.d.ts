// Minimal, correct type surface for the icon sets we use. react-native-vector-icons v10
// does not ship its own types, and @types/react-native-vector-icons (v6) mistypes the
// component (missing glyphMap, wrong name typing). This local declaration is enough.

declare module 'react-native-vector-icons/Feather' {
  import * as React from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class Icon extends React.Component<IconProps> {
    static getFontFamily(): string;
    static loadFont(file?: string): Promise<void>;
  }
}
