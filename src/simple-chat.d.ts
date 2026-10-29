import type { CSSProperties } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "simple-chat": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          open?: boolean;
          layout?: string;
          position?: string;
          "storage-key"?: string;
          "api-base-url"?: string;
          model?: string;
          "theme-id"?: string;
          "theme-css"?: string;
          "system-prompt"?: string;
          style?: CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

export {};
