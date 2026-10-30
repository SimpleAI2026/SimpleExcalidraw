export const SC_WIDTH_MIN: number;
export const SC_WIDTH_MAX: number;
export const SC_WIDTH_DEFAULT: number;
export const SC_WIDTH_STORAGE_KEY: string;
export function clampSidebarWidth(width: number): number;
export function loadSidebarWidth(): number;
export function saveSidebarWidth(width: number): void;
export class SimpleChatElement extends HTMLElement {
  open: boolean;
  apiKey: string;
  systemPrompt: string;
  themeId: string;
  setConfig(config: Record<string, unknown>): void;
  registerTool(tool: unknown): void;
  unregisterTool(name: string): void;
  setTheme(id: string, opts?: { persist?: boolean }): string;
  applyThemeCss(css: string): void;
  setHostSettingsSlot(el: HTMLElement | null): void;
  focusComposer(): void;
  getWidth(): number;
  setWidth(width: number, opts?: { persist?: boolean; emit?: boolean }): number;
  setToolStyle(
    style: Record<string, string>,
    opts?: { replace?: boolean; persist?: boolean },
  ): Record<string, string>;
  getUiStyle(): { themeId: string; toolStyle: Record<string, string> };
  getToolStyle(): Record<string, string>;
}
