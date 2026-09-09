// react-native-html-to-pdf ships no types. Pinned to 0.12.0 deliberately — it is the last
// version built as a classic ReactContextBaseJavaModule bridge module; 1.x was rewritten as a
// TurboModule-only spec (NativeHtmlToPdfSpec) which this project's newArchEnabled=false setup
// cannot load (same class of interop failure documented for op-sqlite in CLAUDE.md §12).
declare module 'react-native-html-to-pdf' {
  export interface Html2PdfOptions {
    html: string;
    fileName?: string;
    directory?: string;
    base64?: boolean;
    height?: number;
    width?: number;
    padding?: number;
    bgColor?: string;
  }

  export interface Html2PdfResult {
    filePath: string;
    base64?: string;
  }

  // The native module exports a plain object (NativeModules.RNHTMLtoPDF), not a class.
  const RNHTMLtoPDF: {
    convert(options: Html2PdfOptions): Promise<Html2PdfResult>;
  };
  export default RNHTMLtoPDF;
}
