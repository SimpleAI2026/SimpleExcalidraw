/**
 * SimpleChat 宿主工具：读取选区 / 场景摘要，并插入元素（绝不静默整页替换）。
 */
import { randomId } from "../random";
import type { ExcalidrawElement } from "../element/types";
import type { ExcalidrawImperativeAPI } from "../types";
import type { SimpleChatTool } from "../components/SimpleChatSidebar";

type ChatToolsDeps = {
  getExcalidrawAPI: () => ExcalidrawImperativeAPI | null | undefined;
  getContainerName?: () => string;
};

const remapBinding = (binding: any, idMap: Map<string, string>) => {
  if (!binding || typeof binding !== "object") {
    return binding;
  }
  if (binding.elementId && idMap.has(binding.elementId)) {
    return { ...binding, elementId: idMap.get(binding.elementId) };
  }
  return binding;
};

/** 与 AiButton.tsx 同逻辑：为插入元素分配新 id，并重映射绑定 / 分组。 */
export const withNewIds = (
  elements: readonly ExcalidrawElement[],
): ExcalidrawElement[] => {
  const idMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();
  elements.forEach((el) => {
    idMap.set(el.id, randomId());
    if (Array.isArray(el.groupIds)) {
      el.groupIds.forEach((gid) => {
        if (!groupIdMap.has(gid)) {
          groupIdMap.set(gid, randomId());
        }
      });
    }
  });
  return elements.map((el) => {
    const next: any = { ...el, id: idMap.get(el.id)! };
    if (next.containerId && idMap.has(next.containerId)) {
      next.containerId = idMap.get(next.containerId);
    }
    if (next.frameId && idMap.has(next.frameId)) {
      next.frameId = idMap.get(next.frameId);
    }
    if (Array.isArray(next.groupIds)) {
      next.groupIds = next.groupIds.map(
        (gid: string) => groupIdMap.get(gid) || gid,
      );
    }
    if (Array.isArray(next.boundElements)) {
      next.boundElements = next.boundElements.map((b: any) =>
        b?.id && idMap.has(b.id) ? { ...b, id: idMap.get(b.id) } : b,
      );
    }
    if (next.startBinding) {
      next.startBinding = remapBinding(next.startBinding, idMap);
    }
    if (next.endBinding) {
      next.endBinding = remapBinding(next.endBinding, idMap);
    }
    return next as ExcalidrawElement;
  });
};

const summarizeElement = (el: ExcalidrawElement) => {
  const base: Record<string, unknown> = {
    id: el.id,
    type: el.type,
    x: Math.round(el.x),
    y: Math.round(el.y),
    width: Math.round((el as any).width || 0),
    height: Math.round((el as any).height || 0),
  };
  if ((el as any).text) {
    base.text = String((el as any).text).slice(0, 120);
  }
  if ((el as any).frameId) {
    base.frameId = (el as any).frameId;
  }
  return base;
};

const normalizeElementsArray = (parsed: any): any[] | null => {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.elements)) {
    return parsed.elements;
  }
  return null;
};

export function createExcalidrawChatTools({
  getExcalidrawAPI,
}: ChatToolsDeps): SimpleChatTool[] {
  return [
    {
      name: "get_selection",
      description:
        "读取当前画布选中的元素摘要（类型、位置、文本等）。改图前先调用以了解选区。",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      handler: async () => {
        const api = getExcalidrawAPI?.();
        if (!api) {
          return { ok: false, error: "Excalidraw API 尚未就绪" };
        }
        const appState = api.getAppState();
        const selectedIds = appState?.selectedElementIds || {};
        const selected = api
          .getSceneElements()
          .filter((el) => selectedIds[el.id]);
        return {
          ok: true,
          count: selected.length,
          elements: selected.slice(0, 80).map(summarizeElement),
        };
      },
    },
    {
      name: "get_scene_summary",
      description:
        "读取当前画布场景摘要：元素数量、按类型统计、画布名、选中数量。",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      handler: async () => {
        const api = getExcalidrawAPI?.();
        if (!api) {
          return { ok: false, error: "Excalidraw API 尚未就绪" };
        }
        const elements = api.getSceneElements();
        const byType: Record<string, number> = {};
        for (const el of elements) {
          byType[el.type] = (byType[el.type] || 0) + 1;
        }
        const appState = api.getAppState();
        const selectedCount = Object.keys(
          appState?.selectedElementIds || {},
        ).length;
        const name = (appState as any)?.name || document.title || "canvas";
        return {
          ok: true,
          name,
          total: elements.length,
          selectedCount,
          byType,
          sample: elements.slice(0, 40).map(summarizeElement),
        };
      },
    },
    {
      name: "insert_elements",
      description:
        "将 Excalidraw 元素 JSON 数组插入当前画布（追加，不会整页替换）。传入 elements 数组或 { elements: [...] }。会重新分配 id。",
      parameters: {
        type: "object",
        properties: {
          elements: {
            description:
              "Excalidraw 元素数组，或包含 elements 字段的对象 / JSON 字符串",
          },
        },
        required: ["elements"],
        additionalProperties: false,
      },
      handler: async (args: any = {}) => {
        const api = getExcalidrawAPI?.();
        if (!api) {
          return { ok: false, error: "Excalidraw API 尚未就绪" };
        }

        let raw = args.elements ?? args;
        if (typeof raw === "string") {
          try {
            const cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, "").trim();
            raw = JSON.parse(cleaned);
          } catch {
            return { ok: false, error: "elements 不是合法 JSON" };
          }
        }

        const arr = normalizeElementsArray(raw);
        if (!arr || !arr.length) {
          return { ok: false, error: "未提供可插入的 elements 数组" };
        }

        // 仅接受看起来像元素的对象；拒绝明显的整页替换 payload 静默行为
        const asElements = arr.filter(
          (el) => el && typeof el === "object" && typeof el.type === "string",
        ) as ExcalidrawElement[];
        if (!asElements.length) {
          return { ok: false, error: "elements 中没有有效的 Excalidraw 元素" };
        }

        const inserted = withNewIds(asElements);
        const current = api.getSceneElements();
        // 追加插入，永不静默整页替换
        api.updateScene({
          elements: [...current, ...inserted],
        });

        return {
          ok: true,
          inserted: inserted.length,
          ids: inserted.map((el) => el.id),
        };
      },
    },
  ];
}

export const DEFAULT_CHAT_SYSTEM_PROMPT = `你是 SimpleExcalidraw 画布助手。用户在右侧聊天；你可以通过工具读取选区 / 场景，并用 insert_elements 向画布追加元素。
规则：
- 需要了解选区时先调用 get_selection；需要全局概况时调用 get_scene_summary
- 改图只用 insert_elements（追加插入；不要假设可以整页替换或删除）
- 回复简洁；需要改图时优先用工具而不是只给文字列表
- 插入的 elements 须为合法 Excalidraw 元素 JSON（含 type、x、y 等）`;

/**
 * 根据画布上下文自动注入 systemPrompt（宿主只注入 prompt / temperature；密钥与模型在 Chat ⚙）。
 */
export function buildAutoChatSystemPrompt(
  ctx: {
    canvasName?: string;
    language?: string;
    selectionSummary?: string;
    sceneSummary?: string;
  } = {},
): string {
  const parts = [DEFAULT_CHAT_SYSTEM_PROMPT];
  const lang = ctx.language || "zh-CN";
  parts.push(
    `## Output language\nPrefer responding in ${
      lang === "en" || lang.startsWith("en") ? "English" : "中文"
    }.`,
  );

  const name = String(ctx.canvasName || "").trim();
  if (name) {
    parts.push(`## Current canvas\n- name: ${name}`);
  }

  const sel = String(ctx.selectionSummary || "").trim();
  if (sel) {
    parts.push(`## Current selection\n${sel}`);
  }

  const scene = String(ctx.sceneSummary || "").trim();
  if (scene) {
    parts.push(`## Scene summary\n${scene}`);
  }

  return parts.join("\n\n");
}

/** 一次性把旧 AI Modal 设置迁移到 SimpleChat localStorage。 */
export function migrateHostChatSettingsOnce(storageKey: string) {
  try {
    const lsKey = `${storageKey || "simplechat"}:settings`;
    if (localStorage.getItem(lsKey)) {
      return;
    }

    let api = "";
    let model = "";
    let apiKey = "";
    try {
      const raw = localStorage.getItem("simpleexcalidraw_ai_settings");
      if (raw) {
        const saved = JSON.parse(raw) || {};
        api = String(saved.api || "").trim();
        model = String(saved.model || "").trim();
        if (typeof saved.secret === "string" && saved.secret) {
          apiKey = saved.secret;
        }
      }
    } catch {
      // ignore
    }
    try {
      const sessionSecret = sessionStorage.getItem(
        "simpleexcalidraw_ai_secret_session",
      );
      if (sessionSecret) {
        apiKey = sessionSecret;
      }
    } catch {
      // ignore
    }

    if (!api && !model && !apiKey) {
      return;
    }

    // 旧 Modal 存的是完整 completions URL；SimpleChat 要 base
    let apiBaseUrl = api.replace(/\/+$/, "");
    apiBaseUrl = apiBaseUrl
      .replace(/\/chat\/completions$/i, "")
      .replace(/\/completions$/i, "");

    const payload: Record<string, unknown> = {
      apiBaseUrl,
      model,
      rememberKey: !!apiKey,
      systemPrompt: "",
    };
    if (apiKey) {
      payload.apiKey = apiKey;
    }
    localStorage.setItem(lsKey, JSON.stringify(payload));
  } catch (e) {
    console.warn("migrateHostChatSettingsOnce failed:", e);
  }
}
