import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { ToolButton, ToolButtonSize } from "./ToolButton";
import { AIIcon } from "./icons";
import { Button, Modal, Input, Upload, message, AutoComplete, Radio } from "antd";
import "./AiDialog.scss";
import {
  requestCompletions,
  requestTextCompletions,
  buildExtendPrompt,
  buildMindPrompt,
  buildExcalidrawPrompt,
  loadAISettings,
  saveAISettings,
} from "./AiButtonAction";
import {
  useExcalidrawAppState,
  useExcalidrawSetAppState,
  useExcalidrawActionManager,
  useExcalidrawElements,
} from "./App";
import { actionZoomToFit } from "../actions";
import { loadFromJSONString } from "../data/json";
import { t } from "../i18n";
import type { ModalProps, ConfigProviderProps } from "antd";
import pdfToText from "react-pdftotext";
import {
  parseMermaidToExcalidraw,
  validateMermaid,
} from "../mermaid-to-excalidrawjson";
import {
  getContainerListFromStorage,
  setContainerListToStorage,
  validateContainerName,
} from "../excalidraw-app/data/localStorage";
import { requestContainerChange } from "../excalidraw-app/data/containerLifecycle";
import { randomId } from "../random";
import type { ExcalidrawElement } from "../element/types";

type AIButtonProps = {
  title?: string;
  onClick?(): void;
  isMobile?: boolean;
  size?: ToolButtonSize;
  className?: string;
  icon?: React.ReactNode;
  checked?: boolean;
};

const DEFAULT_SIZE: ToolButtonSize = "medium";
type SizeType = ConfigProviderProps["componentSize"];

type ApplyMode = "replace" | "insert" | "newCanvas";

const getExcalidrawContainer = (): HTMLElement => {
  return (
    (document.querySelector(".excalidraw") as HTMLElement | null) ||
    document.body
  );
};

const aiModalStyles: ModalProps["styles"] = {
  mask: {
    background: "rgba(18, 18, 18, 0.2)",
  },
  container: {
    background: "var(--island-bg-color)",
    border: "1px solid var(--dialog-border-color)",
    boxShadow: "var(--modal-shadow)",
    borderRadius: 6,
    padding: 0,
    color: "var(--text-primary-color)",
    overflow: "hidden",
  },
  header: {
    background: "var(--island-bg-color)",
    borderBottom: "1px solid var(--dialog-border-color)",
    marginBottom: 0,
    padding: "1.25rem 1.5rem 0.75rem",
    borderRadius: 0,
    color: "var(--text-primary-color)",
  },
  body: {
    background: "var(--island-bg-color)",
    color: "var(--text-primary-color)",
    padding: "1rem 1.5rem 1.25rem",
  },
  footer: {
    background: "var(--island-bg-color)",
    borderTop: "1px solid var(--dialog-border-color)",
    marginTop: 0,
    padding: "0.75rem 1.5rem 1.25rem",
    borderRadius: 0,
  },
};

const MODEL_OPTIONS = [
  { value: "Pro/moonshotai/Kimi-K2.5", label: "Pro/moonshotai/Kimi-K2.5" },
  { value: "Pro/zai-org/GLM-5", label: "Pro/zai-org/GLM-5" },
  { value: "Pro/zai-org/GLM-4.7", label: "Pro/zai-org/GLM-4.7" },
  { value: "deepseek-ai/DeepSeek-V3.2", label: "deepseek-ai/DeepSeek-V3.2" },
];

const stripMermaidFences = (raw: string): string => {
  const trimmed = (raw || "").trim();
  const fenced = trimmed.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  if (fenced) {
    return fenced[1].trim();
  }
  return trimmed;
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

const remapBinding = (binding: any, idMap: Map<string, string>) => {
  if (!binding || typeof binding !== "object") {
    return binding;
  }
  if (binding.elementId && idMap.has(binding.elementId)) {
    return { ...binding, elementId: idMap.get(binding.elementId) };
  }
  return binding;
};

const withNewIds = (
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

const formatAiError = (err: any): string => {
  if (!err) {
    return t("other.aiRequestFailed");
  }
  if (err.name === "AbortError") {
    return t("other.aiCancelled");
  }
  if (err.status || err.body) {
    return `${t("other.aiRequestFailed")} (${err.status || "?"}: ${
      err.body || err.message || ""
    })`.slice(0, 280);
  }
  if (typeof err.message === "string" && err.message) {
    return err.message.slice(0, 280);
  }
  return t("other.aiRequestFailed");
};

export const AIButton: React.FC<AIButtonProps> = (props) => {
  const [open, setOpen] = useState(false);
  const defaults = loadAISettings();
  const [textAreaValue, setTextAreaValue] = useState(defaults.prompt || "");
  const [api, setApi] = useState(defaults.api || "");
  const [secret, setSecret] = useState(defaults.secret || "");
  const [model, setModel] = useState(
    defaults.model || "Pro/moonshotai/Kimi-K2.5",
  );
  const [modelSearch, setModelSearch] = useState("");
  const [loadingExcalidraw, setLoadingExcalidraw] = useState(false);
  const [loadingMind, setLoadingMind] = useState(false);
  const [extending, setExtending] = useState(false);
  const isAnyLoading = loadingExcalidraw || loadingMind || extending;
  const canSubmit =
    !!textAreaValue.trim() && !!api.trim() && !!secret.trim() && !!model.trim();
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTextAreaValue(e.target.value);
  const [size] = useState<SizeType>("middle");
  const appState = useExcalidrawAppState();
  const setAppState = useExcalidrawSetAppState();
  const actionManager = useExcalidrawActionManager();
  const currentElements = useExcalidrawElements();

  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 500);
  const abortRef = useRef<AbortController | null>(null);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMode, setApplyMode] = useState<ApplyMode>("replace");
  const pendingRef = useRef<{
    elements: ExcalidrawElement[];
    loadedAppState: any;
  } | null>(null);

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 500);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    saveAISettings({ api, secret, model });
  }, [api, secret, model]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const { TextArea } = Input;

  const abortOngoing = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const closeModal = () => {
    abortOngoing();
    setLoadingExcalidraw(false);
    setLoadingMind(false);
    setExtending(false);
    setOpen(false);
  };

  const applyElementsToScene = (
    elements: ExcalidrawElement[],
    loadedAppState: any,
  ) => {
    const appStateForFit = { ...appState, ...loadedAppState };
    const nextAppState = elements.length
      ? actionZoomToFit.perform(elements, appStateForFit).appState
      : { ...appState, ...loadedAppState };

    try {
      actionManager.updater({
        elements,
        appState: nextAppState,
        commitToHistory: true,
        syncHistory: true,
      });
      setAppState(nextAppState);
      setOpen(false);
      setApplyOpen(false);
      pendingRef.current = null;
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("AI更新场景失败", e);
      }
      message.error(t("other.aiUpdateSceneFailed"));
    }
  };

  const createNewCanvasWithElements = (elements: ExcalidrawElement[]) => {
    const base = `ai-${Date.now()}`;
    const validation = validateContainerName(base);
    const name = validation.ok ? validation.name : `canvas-${Date.now()}`;
    const list = getContainerListFromStorage();
    // Write elements first; only append to the list after storage succeeds.
    try {
      localStorage.setItem(name, JSON.stringify(elements));
    } catch (error) {
      console.error(error);
      message.error(t("other.storageQuotaExceeded"));
      return;
    }
    try {
      setContainerListToStorage([...list, name]);
    } catch (error) {
      console.error(error);
      try {
        localStorage.removeItem(name);
      } catch {
        // ignore
      }
      message.error(t("other.storageQuotaExceeded"));
      return;
    }
    setApplyOpen(false);
    pendingRef.current = null;
    setOpen(false);
    requestContainerChange({
      type: "newWithElements",
      name,
      elements,
    });
  };

  const presentOrApply = (
    elements: ExcalidrawElement[],
    loadedAppState: any,
  ) => {
    if (!elements.length) {
      message.error(t("other.aiEmptyResult"));
      return;
    }

    const sceneHasContent = (currentElements?.length || 0) > 0;
    if (!sceneHasContent) {
      applyElementsToScene(elements, loadedAppState);
      return;
    }

    pendingRef.current = { elements, loadedAppState };
    setApplyMode("replace");
    setApplyOpen(true);
  };

  const confirmApply = () => {
    const pending = pendingRef.current;
    if (!pending) {
      setApplyOpen(false);
      return;
    }
    const { elements, loadedAppState } = pending;

    if (applyMode === "replace") {
      applyElementsToScene(elements, loadedAppState);
      return;
    }

    if (applyMode === "insert") {
      const inserted = withNewIds(elements);
      const merged = [...(currentElements || []), ...inserted];
      applyElementsToScene(merged as ExcalidrawElement[], loadedAppState);
      return;
    }

    if (applyMode === "newCanvas") {
      createNewCanvasWithElements(elements);
    }
  };

  const sharedContent = (
    <div className="AiModal__form">
      <label className="AiModal__field">
        <span className="AiModal__label">{t("toolBar.aiAPI")}</span>
        <Input
          className="AiModal__control"
          name="api"
          value={api}
          onChange={(e) => setApi(e.target.value)}
          placeholder="https://api.openai.com/v1/chat/completions"
          allowClear
        />
      </label>
      <label className="AiModal__field">
        <span className="AiModal__label">{t("toolBar.aiAPIKey")}</span>
        <Input.Password
          className="AiModal__control"
          name="secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="sk-xxxxx..."
          autoComplete="off"
        />
      </label>
      <p className="AiModal__hint">{t("other.aiSecretSessionWarning")}</p>
      <label className="AiModal__field">
        <span className="AiModal__label">{t("toolBar.aiModel")}</span>
        <AutoComplete
          className="AiModal__control"
          options={
            modelSearch
              ? MODEL_OPTIONS.filter((opt) =>
                  opt.value.toLowerCase().includes(modelSearch.toLowerCase()),
                )
              : MODEL_OPTIONS
          }
          value={model}
          onChange={(value) => {
            setModel(value);
            setModelSearch(value);
          }}
          onSelect={(value) => {
            setModel(value);
            setModelSearch("");
          }}
          placeholder={t("other.aiModelPlaceholder")}
          getPopupContainer={getExcalidrawContainer}
        />
      </label>
      <label className="AiModal__field">
        <span className="AiModal__label">{t("toolBar.aiPrompt")}</span>
        <TextArea
          className="AiModal__control AiModal__prompt"
          value={textAreaValue}
          showCount
          maxLength={9000}
          onChange={onChange}
          placeholder={t("toolBar.aiPromptPlaceholder")}
        />
      </label>
    </div>
  );


  const handleExcalidrawSubmit = async () => {
    if (
      !textAreaValue.trim() ||
      !api.trim() ||
      !secret.trim() ||
      !model.trim()
    ) {
      message.error(t("other.aiInvalidParams"));
      return;
    }

    abortOngoing();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingExcalidraw(true);
    try {
      saveAISettings({ api, secret, model, prompt: textAreaValue });

      const requestPrompt = buildExcalidrawPrompt(textAreaValue);
      const { ideas } = await requestCompletions({
        api,
        secret,
        model,
        temperature: 0.6,
        prompt: requestPrompt,
        signal: controller.signal,
      });
      const content = typeof ideas === "string" ? ideas : JSON.stringify(ideas);

      let excalidrawElements: any[] = [];
      let loadedAppState: any = {};
      let parsedOk = false;

      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleanContent);
        const elementsArr = normalizeElementsArray(parsed);
        if (!elementsArr || elementsArr.length === 0) {
          throw new Error("empty elements");
        }
        const excalidrawJsonStr = JSON.stringify({
          type: "excalidraw",
          version: 2,
          source: "http://localhost:3000",
          elements: elementsArr,
        });
        const loaded = await loadFromJSONString(
          excalidrawJsonStr,
          appState,
          null,
          true,
        );
        excalidrawElements = loaded.elements as any[];
        loadedAppState = loaded.appState;
        parsedOk = excalidrawElements.length > 0;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.log("Not a direct JSON, err: ", e);
        }
        parsedOk = false;
      }

      if (!parsedOk || !excalidrawElements.length) {
        message.error(t("other.aiEmptyResult"));
        return;
      }

      presentOrApply(excalidrawElements as ExcalidrawElement[], loadedAppState);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        message.info(t("other.aiCancelled"));
      } else {
        message.error(formatAiError(err));
      }
    } finally {
      setLoadingExcalidraw(false);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const handleMindSubmit = async () => {
    if (
      !textAreaValue.trim() ||
      !api.trim() ||
      !secret.trim() ||
      !model.trim()
    ) {
      message.error(t("other.aiInvalidParams"));
      return;
    }

    abortOngoing();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingMind(true);
    try {
      saveAISettings({ api, secret, model, prompt: textAreaValue });

      const requestPrompt = buildMindPrompt(textAreaValue);
      const { ideas } = await requestCompletions({
        api,
        secret,
        model,
        temperature: 0.6,
        prompt: requestPrompt,
        signal: controller.signal,
      });
      const mermaidRaw =
        typeof ideas === "string" ? ideas : JSON.stringify(ideas);
      const mermaidStr = stripMermaidFences(mermaidRaw);

      const valid = await validateMermaid(mermaidStr);
      if (!valid) {
        message.error(t("other.aiMermaidInvalid"));
        return;
      }

      const excalidrawJson = await parseMermaidToExcalidraw(mermaidStr);
      const excalidrawJsonStr = JSON.stringify(excalidrawJson);
      const { elements, appState: loadedAppState } = await loadFromJSONString(
        excalidrawJsonStr,
        appState,
        null,
        true,
      );

      if (!elements?.length) {
        message.error(t("other.aiEmptyResult"));
        return;
      }

      presentOrApply(elements as ExcalidrawElement[], loadedAppState);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        message.info(t("other.aiCancelled"));
      } else {
        message.error(formatAiError(err));
      }
    } finally {
      setLoadingMind(false);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const handleExtendPrompt = async () => {
    if (
      !textAreaValue.trim() ||
      !api.trim() ||
      !secret.trim() ||
      !model.trim()
    ) {
      message.error(t("other.aiInvalidParams"));
      return;
    }

    abortOngoing();
    const controller = new AbortController();
    abortRef.current = controller;
    setExtending(true);
    try {
      saveAISettings({ api, secret, model });
      const expandedPrompt = buildExtendPrompt(textAreaValue);
      const { content } = await requestTextCompletions({
        api,
        secret,
        model,
        temperature: 0.3,
        prompt: expandedPrompt,
        signal: controller.signal,
      });
      if (content.trim()) {
        setTextAreaValue(content);
        message.success(t("other.aiParseSuccess"));
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        message.info(t("other.aiCancelled"));
      } else {
        message.error(formatAiError(err));
      }
    } finally {
      setExtending(false);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const PROMPT_MAX_CHARS = 9000;
  const UPLOAD_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

  const applyUploadedPrompt = (raw: string, successKey: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      message.error(t("other.aiParseError"));
      return;
    }
    if (trimmed.length > PROMPT_MAX_CHARS) {
      setTextAreaValue(trimmed.slice(0, PROMPT_MAX_CHARS));
      message.warning(t("other.aiPromptTruncated"));
    } else {
      setTextAreaValue(trimmed);
      message.success(t(successKey));
    }
  };

  const handleParsePromptUpload = async (file: File) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.size > UPLOAD_MAX_BYTES) {
      message.error(t("other.aiFileTooLarge"));
      return false;
    }
    try {
      if (ext === "md" || ext === "txt" || ext === "csv") {
        const text = await file.text();
        applyUploadedPrompt(text, "other.aiParseSuccess");
      } else if (ext === "pdf") {
        const text = await pdfToText(file);
        if (text.trim()) {
          applyUploadedPrompt(text, "other.aiPdfParseSuccess");
        } else {
          message.error(t("other.aiPdfParseFailed"));
        }
      } else {
        message.error(t("other.aiFileSupportError"));
      }
    } catch (e) {
      message.error(t("other.aiParseError"));
      if (process.env.NODE_ENV !== "production") {
        console.error(e);
      }
    }
    return false;
  };

  const footer = (
    <div className="AiModal__footer">
      <div
        className={
          isSmallScreen
            ? "AiModal__footerRow AiModal__footerRow--stack"
            : "AiModal__footerRow"
        }
      >
        <Upload
          showUploadList={false}
          beforeUpload={handleParsePromptUpload}
          accept=".md,.txt,.csv,.pdf"
          maxCount={1}
        >
          <Button size="small" className="AiModal__upload">
            {t("other.aiUploadHint")}
          </Button>
        </Upload>
        <Button
          type="default"
          size="small"
          className="AiModal__expand"
          loading={extending}
          disabled={!canSubmit || isAnyLoading}
          onClick={handleExtendPrompt}
        >
          {t("toolBar.aiExpand")}
        </Button>
      </div>
      <div className="AiModal__actions">
        <Button
          type="primary"
          size={size}
          className="AiModal__action"
          loading={loadingExcalidraw}
          disabled={!canSubmit || loadingMind || extending}
          onClick={handleExcalidrawSubmit}
        >
          {t("toolBar.aiSimpleFlow")}
        </Button>
        <Button
          type="primary"
          size={size}
          className="AiModal__action"
          loading={loadingMind}
          disabled={!canSubmit || loadingExcalidraw || extending}
          onClick={handleMindSubmit}
        >
          {t("toolBar.aiComplexFlow")}
        </Button>
      </div>
    </div>
  );

  const handleClick = () => {
    setOpen(true);
    props.onClick?.();
  };

  const cancelApply = () => {
    setApplyOpen(false);
    pendingRef.current = null;
  };

  return (
    <>
      <ToolButton
        type="icon"
        size={props.size || DEFAULT_SIZE}
        title={props.title || t("toolBar.aiAssistant")}
        aria-label={props.title || t("toolBar.aiAssistant")}
        label={undefined}
        icon={props.icon ?? AIIcon}
        onClick={handleClick}
        selected={!!props.checked}
        className={clsx(props.className, { "is-mobile": !!props.isMobile })}
        data-testid="toolbar-ai"
        showAriaLabel={false}
      />
      <Modal
        centered
        className="AiModal"
        rootClassName="AiModalRoot"
        title={t("toolBar.aiAssistant")}
        width={isSmallScreen ? "100%" : 720}
        styles={aiModalStyles}
        footer={footer}
        open={open}
        onCancel={closeModal}
        maskClosable={false}
        destroyOnHidden
        getContainer={getExcalidrawContainer}
        style={isSmallScreen ? { maxWidth: "100vw", margin: 0 } : undefined}
      >
        {sharedContent}
      </Modal>
      <Modal
        centered
        className="AiApplyModal"
        rootClassName="AiApplyModalRoot"
        title={t("other.aiApplyModeTitle")}
        open={applyOpen}
        onCancel={cancelApply}
        onOk={confirmApply}
        okText={t("buttons.confirm")}
        cancelText={t("buttons.cancel")}
        maskClosable={false}
        destroyOnHidden
        width={isSmallScreen ? "100%" : 440}
        styles={aiModalStyles}
        getContainer={getExcalidrawContainer}
        style={isSmallScreen ? { maxWidth: "100vw", margin: 0 } : undefined}
      >
        <p className="AiApplyModal__hint">{t("other.aiReplaceConfirm")}</p>
        <Radio.Group
          className="AiApplyModal__modes"
          vertical
          value={applyMode}
          onChange={(e) => setApplyMode(e.target.value as ApplyMode)}
          options={[
            { value: "replace", label: t("other.aiModeReplace") },
            { value: "insert", label: t("other.aiModeInsert") },
            { value: "newCanvas", label: t("other.aiModeNewCanvas") },
          ]}
        />
      </Modal>
    </>
  );
};

export default AIButton;
