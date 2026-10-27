/**
 * In-app multi-canvas switching (P2.1 / U-04) and file reclaim on delete (P2.2 / B-09).
 *
 * Dialogs request a change via CustomEvent; excalidraw-app/index.tsx applies it with
 * flushSave → set name → updateScene → load files (no location.reload).
 */

import { createStore, del, entries } from "idb-keyval";
import { isInitializedImageElement } from "../../element/typeChecks";
import { ExcalidrawElement, FileId } from "../../element/types";
import { AppState, ExcalidrawImperativeAPI } from "../../types";
import { STORAGE_KEYS } from "../app_constants";
import { LocalData } from "./LocalData";
import {
  getContainerListFromStorage,
  getContainerNameFromStorage,
  getElementsFromStorage,
  removeContainerFromStorage,
  renameContainerNameToStorage,
  setContainerListToStorage,
  setContainerNameToStorage,
  setElementsToStorage,
} from "./localStorage";
import { updateStaleImageStatuses } from "./FileManager";

import { message } from "antd";
import { t } from "../../i18n";

const filesStore = createStore("files-db", "files-store");

export const CONTAINER_CHANGE_EVENT = "simpleexcalidraw:container-change";
export const CONTAINER_CHANGE_APPLIED_EVENT =
  "simpleexcalidraw:container-change-applied";

export type ContainerChangeDetail =
  | { type: "switch"; name: string }
  | { type: "new"; name: string }
  | { type: "delete"; name: string }
  | { type: "rename"; oldName: string; newName: string }
  | {
      type: "newWithElements";
      name: string;
      elements: readonly ExcalidrawElement[];
    };

/** Per-canvas viewport slice (B-09 light): scroll/zoom only; theme stays global. */
export type ContainerViewportSlice = {
  scrollX?: number;
  scrollY?: number;
  zoom?: AppState["zoom"];
};

const VIEWPORT_STORAGE_KEY = "simpleexcalidraw_container_viewports";

export const requestContainerChange = (detail: ContainerChangeDetail) => {
  window.dispatchEvent(
    new CustomEvent<ContainerChangeDetail>(CONTAINER_CHANGE_EVENT, { detail }),
  );
};

const readViewportMap = (): Record<string, ContainerViewportSlice> => {
  try {
    const raw = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeViewportMap = (map: Record<string, ContainerViewportSlice>) => {
  try {
    localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.error(error);
  }
};

export const saveContainerViewport = (
  containerName: string,
  appState: Pick<AppState, "scrollX" | "scrollY" | "zoom">,
) => {
  if (!containerName) {
    return;
  }
  const map = readViewportMap();
  map[containerName] = {
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
    zoom: appState.zoom,
  };
  writeViewportMap(map);
};

export const loadContainerViewport = (
  containerName: string,
): ContainerViewportSlice | null => {
  const map = readViewportMap();
  return map[containerName] || null;
};

const safeGetElements = (name: string): ExcalidrawElement[] => {
  try {
    return getElementsFromStorage(name);
  } catch {
    return [];
  }
};

export const collectFileIdsFromElements = (
  elements: readonly ExcalidrawElement[],
): FileId[] => {
  const ids: FileId[] = [];
  for (const el of elements) {
    if (isInitializedImageElement(el)) {
      ids.push(el.fileId);
    }
  }
  return ids;
};

/**
 * Best-effort: delete IndexedDB files only referenced by `deletedElements`
 * and not by any remaining canvas (P2.2 / B-09).
 * Does not reclaim files still referenced elsewhere; orphans older than 1 day
 * are still cleaned by LocalData.fileStorage.clearObsoleteFiles on load.
 */
export const reclaimFilesOnlyInElements = async (
  deletedElements: readonly ExcalidrawElement[],
  remainingElements: readonly ExcalidrawElement[],
) => {
  const deletedIds = new Set(collectFileIdsFromElements(deletedElements));
  if (!deletedIds.size) {
    return { deleted: 0 };
  }
  const stillUsed = new Set(collectFileIdsFromElements(remainingElements));
  let deleted = 0;
  for (const id of deletedIds) {
    if (!stillUsed.has(id)) {
      try {
        await del(id, filesStore);
        deleted += 1;
      } catch (error) {
        console.error("reclaim file failed", id, error);
      }
    }
  }
  return { deleted };
};

export const getAllRemainingElementsExcept = (
  excludeContainerName: string,
): ExcalidrawElement[] => {
  const list = getContainerListFromStorage().filter(
    (n) => n !== excludeContainerName,
  );
  const out: ExcalidrawElement[] = [];
  for (const name of list) {
    try {
      out.push(...safeGetElements(name));
    } catch {
      // ignore corrupt canvas
    }
  }
  return out;
};

const sceneAppStateForContainer = (name: string, current: AppState) => {
  const viewport = loadContainerViewport(name);
  // Always set scroll/zoom (never optional) so updateScene's Pick<AppState, K>
  // does not require `| undefined` fields.
  return {
    name,
    openDialog: null,
    selectedElementIds: {} as AppState["selectedElementIds"],
    selectedGroupIds: {} as AppState["selectedGroupIds"],
    editingGroupId: null,
    editingElement: null,
    multiElement: null,
    resizingElement: null,
    selectionElement: null,
    selectedLinearElement: null,
    scrollX: viewport?.scrollX ?? current.scrollX,
    scrollY: viewport?.scrollY ?? current.scrollY,
    zoom: viewport?.zoom ?? current.zoom,
    theme: current.theme,
  };
};

const loadFilesForScene = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
  elements: readonly ExcalidrawElement[],
) => {
  const currFiles = excalidrawAPI.getFiles();
  const fileIds = collectFileIdsFromElements(elements).filter(
    (id) => !currFiles[id],
  );
  if (!fileIds.length) {
    return;
  }
  const { loadedFiles, erroredFiles } = await LocalData.fileStorage.getFiles(
    fileIds,
  );
  if (loadedFiles.length) {
    excalidrawAPI.addFiles(loadedFiles);
  }
  updateStaleImageStatuses({
    excalidrawAPI,
    erroredFiles,
    elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
  });
};

/**
 * Apply a container change against a live Excalidraw API (no full page reload).
 * Returns the active container name after the change.
 */
export const applyContainerChange = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
  detail: ContainerChangeDetail,
): Promise<string> => {
  const currentName = getContainerNameFromStorage();
  const currentAppState = excalidrawAPI.getAppState();
  const finish = (name: string) => {
    window.dispatchEvent(
      new CustomEvent(CONTAINER_CHANGE_APPLIED_EVENT, {
        detail: { type: detail.type, activeName: name },
      }),
    );
    return name;
  };

  // Persist viewport for the canvas we are leaving (when still valid).
  if (currentName) {
    saveContainerViewport(currentName, currentAppState);
  }

  // CRITICAL: flush debounced save while still on the old container name.
  LocalData.flushSave();

  if (detail.type === "rename") {
    // Flush already done above while still on oldName.
    const result = renameContainerNameToStorage(detail.oldName, detail.newName);
    if (!result.ok) {
      return finish(currentName);
    }
    const map = readViewportMap();
    if (map[detail.oldName]) {
      map[result.name] = map[detail.oldName];
      delete map[detail.oldName];
      writeViewportMap(map);
    }
    excalidrawAPI.updateScene({
      appState: { name: result.name, openDialog: null },
    });
    return finish(result.name);
  }

  if (detail.type === "delete") {
    const listBefore = getContainerListFromStorage();
    if (listBefore.length <= 1) {
      // Caller should have blocked; ensure default exists.
      const defaultName = STORAGE_KEYS.LOCAL_STORAGE_DEFAULT_CONTAINER_NAME;
      if (!listBefore.includes(defaultName)) {
        setContainerListToStorage([defaultName]);
        setContainerNameToStorage(defaultName);
        setElementsToStorage([]);
      }
      return finish(getContainerNameFromStorage());
    }

    let deletedElements: ExcalidrawElement[] = [];
    try {
      deletedElements = safeGetElements(detail.name);
    } catch {
      deletedElements = [];
    }
    const remainingForGc = getAllRemainingElementsExcept(detail.name);

    removeContainerFromStorage(detail.name);
    const map = readViewportMap();
    delete map[detail.name];
    writeViewportMap(map);

    // Fire-and-forget reclaim (best-effort).
    void reclaimFilesOnlyInElements(deletedElements, remainingForGc);

    const listAfter = getContainerListFromStorage();
    let nextName = currentName === detail.name ? listAfter[0] : currentName;
    if (!listAfter.length) {
      nextName = STORAGE_KEYS.LOCAL_STORAGE_DEFAULT_CONTAINER_NAME;
      setContainerListToStorage([nextName]);
      setElementsToStorage([]);
    }
    if (currentName === detail.name) {
      setContainerNameToStorage(nextName);
      const elements = safeGetElements(nextName);
      excalidrawAPI.history.clear();
      excalidrawAPI.updateScene({
        elements,
        appState: sceneAppStateForContainer(nextName, currentAppState),
        commitToHistory: false,
      });
      await loadFilesForScene(excalidrawAPI, elements);
      return finish(nextName);
    }
    // Deleted a non-active canvas — keep switch dialog open for further edits.
    return finish(currentName);
  }

  if (detail.type === "new") {
    setContainerNameToStorage(detail.name);
    // Caller already appended to list + wrote empty elements when needed.
    const elements = safeGetElements(detail.name);
    excalidrawAPI.history.clear();
    excalidrawAPI.updateScene({
      elements,
      appState: sceneAppStateForContainer(detail.name, currentAppState),
      commitToHistory: false,
    });
    return finish(detail.name);
  }

  if (detail.type === "newWithElements") {
    try {
      localStorage.setItem(detail.name, JSON.stringify(detail.elements));
    } catch (error: any) {
      console.error(error);
      if (
        error?.name === "QuotaExceededError" ||
        error?.code === 22 ||
        error?.code === 1014
      ) {
        try {
          message.error(t("other.storageQuotaExceeded"));
        } catch {
          // ignore toast failures
        }
      }
      excalidrawAPI.updateScene({ appState: { openDialog: null } });
      return finish(currentName);
    }
    setContainerNameToStorage(detail.name);
    excalidrawAPI.history.clear();
    excalidrawAPI.updateScene({
      elements: detail.elements as ExcalidrawElement[],
      appState: sceneAppStateForContainer(detail.name, currentAppState),
      commitToHistory: false,
    });
    await loadFilesForScene(excalidrawAPI, detail.elements);
    return finish(detail.name);
  }

  // switch
  if (detail.name === currentName) {
    excalidrawAPI.updateScene({ appState: { openDialog: null } });
    return finish(currentName);
  }
  setContainerNameToStorage(detail.name);
  const elements = safeGetElements(detail.name);
  excalidrawAPI.history.clear();
  excalidrawAPI.updateScene({
    elements,
    appState: sceneAppStateForContainer(detail.name, currentAppState),
    commitToHistory: false,
  });
  await loadFilesForScene(excalidrawAPI, elements);
  return finish(detail.name);
};

/** Debug / ops: count IDB files (not used in UI yet). */
export const countStoredFiles = async () => {
  const all = await entries(filesStore);
  return all.length;
};
