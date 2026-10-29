/**
 * React 封装 vendored <simple-chat>。
 * 副作用导入注册自定义元素；通过 ref 暴露 getElement / setHostSettingsSlot / setWidth。
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import "../vendor/simplechat/simplechat.min.js";

export type SimpleChatConfig = {
  apiBaseUrl?: string;
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  headers?: Record<string, string>;
};

export type SimpleChatTool = {
  name: string;
  description?: string;
  parameters?: object;
  handler: (args?: any) => any | Promise<any>;
};

export type SimpleChatSidebarProps = {
  open?: boolean;
  config?: SimpleChatConfig;
  tools?: SimpleChatTool[];
  storageKey?: string;
  layout?: string;
  position?: string;
  className?: string;
  themeId?: string;
  theme?: string;
  themeCss?: string;
  themeStyle?: React.CSSProperties;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onResize?: (payload: { width: number }) => void;
};

export type SimpleChatSidebarHandle = {
  getElement: () => HTMLElement | null;
  setTheme: (id: string) => void;
  setHostSettingsSlot: (el: HTMLElement | null) => void;
  getWidth: () => number | undefined;
  setWidth: (
    width: number,
    opts?: { persist?: boolean; emit?: boolean },
  ) => number | undefined;
};

type SimpleChatEl = HTMLElement & {
  open: boolean;
  apiKey: string;
  systemPrompt: string;
  setConfig?: (cfg: Record<string, unknown>) => void;
  registerTool?: (tool: SimpleChatTool) => void;
  setTheme?: (id: string, opts?: { persist?: boolean }) => string;
  applyThemeCss?: (css: string) => void;
  setHostSettingsSlot?: (el: HTMLElement | null) => void;
  getWidth?: () => number;
  setWidth?: (
    width: number,
    opts?: { persist?: boolean; emit?: boolean },
  ) => number;
  setToolStyle?: (
    style: Record<string, string>,
    opts?: { replace?: boolean; persist?: boolean },
  ) => Record<string, string>;
  getUiStyle?: () => { themeId: string; toolStyle: Record<string, string> };
  getToolStyle?: () => Record<string, string>;
};

function toolsKey(tools: SimpleChatTool[] | undefined) {
  return (tools || []).map((t) => t.name).join("\0");
}

export const SimpleChatSidebar = forwardRef<
  SimpleChatSidebarHandle,
  SimpleChatSidebarProps
>((props, ref) => {
  const {
    open = true,
    config = {},
    tools = [],
    storageKey = "simplechat",
    layout = "sidebar",
    position = "right",
    className = "",
    themeId = "",
    theme = "",
    themeCss = "",
    themeStyle,
    onClose,
    onOpenChange,
    onResize,
  } = props;

  const elRef = useRef<SimpleChatEl | null>(null);
  const syncedToolKey = useRef("");
  const toolsRef = useRef(tools);
  toolsRef.current = tools;

  const resolvedThemeId = (themeId || theme || "").trim();

  const syncTools = useCallback((el: SimpleChatEl, force = false) => {
    const list = toolsRef.current || [];
    const key = toolsKey(list);
    if (!force && key === syncedToolKey.current) {
      return;
    }
    syncedToolKey.current = key;
    for (const t of list) {
      el.registerTool?.(t);
    }
  }, []);

  const applyConfigAndTheme = useCallback(() => {
    const el = elRef.current;
    if (!el) {
      return;
    }
    const cfg = config || {};
    if (typeof el.setConfig === "function") {
      el.setConfig({
        apiBaseUrl: cfg.apiBaseUrl ?? "",
        apiKey: cfg.apiKey ?? "",
        model: cfg.model ?? "",
        systemPrompt: cfg.systemPrompt,
        temperature: cfg.temperature,
        maxTokens: cfg.maxTokens,
        headers: cfg.headers,
      });
    }
    if (cfg.apiKey) {
      el.apiKey = cfg.apiKey;
    }
    if (cfg.systemPrompt != null) {
      el.systemPrompt = cfg.systemPrompt;
    }

    const tid = (themeId || theme || "").trim();
    if (tid && typeof el.setTheme === "function") {
      el.setTheme(tid, { persist: false });
    } else if (tid) {
      el.setAttribute("theme-id", tid);
    }

    if (typeof el.applyThemeCss === "function") {
      el.applyThemeCss(themeCss || "");
    }
  }, [config, themeCss, themeId, theme]);

  const applyAll = useCallback(
    (forceTools = false) => {
      const el = elRef.current;
      if (!el) {
        return;
      }
      applyConfigAndTheme();
      syncTools(el, forceTools);
      el.open = open;
    },
    [applyConfigAndTheme, syncTools, open],
  );

  useImperativeHandle(
    ref,
    () => ({
      getElement: () => elRef.current,
      setTheme: (id: string) => {
        elRef.current?.setTheme?.(id);
      },
      setHostSettingsSlot: (node: HTMLElement | null) => {
        elRef.current?.setHostSettingsSlot?.(node);
      },
      getWidth: () => elRef.current?.getWidth?.(),
      setWidth: (width, opts) => elRef.current?.setWidth?.(width, opts),
    }),
    [],
  );

  useEffect(() => {
    const el = elRef.current;
    if (!el) {
      return;
    }

    const handleClose = () => {
      onOpenChange?.(false);
      onClose?.();
    };
    const handleResize = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const width = Number(detail?.width);
      if (Number.isFinite(width)) {
        onResize?.({ width });
      }
    };

    applyAll(true);
    el.addEventListener("sc-close", handleClose);
    el.addEventListener("sc-resize", handleResize);
    return () => {
      el.removeEventListener("sc-close", handleClose);
      el.removeEventListener("sc-resize", handleResize);
    };
    // mount once for listeners; applyAll kept current via other effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyConfigAndTheme();
  }, [applyConfigAndTheme]);

  useEffect(() => {
    if (elRef.current) {
      elRef.current.open = open;
    }
  }, [open]);

  useEffect(() => {
    if (elRef.current) {
      syncTools(elRef.current, true);
    }
  }, [tools, syncTools]);

  return React.createElement("simple-chat", {
    ref: elRef,
    className,
    style: themeStyle,
    open: open || undefined,
    layout,
    position,
    "storage-key": storageKey,
    "api-base-url": config?.apiBaseUrl ?? "",
    model: config?.model ?? "",
    "theme-id": resolvedThemeId || undefined,
  });
});

SimpleChatSidebar.displayName = "SimpleChatSidebar";

export default SimpleChatSidebar;
