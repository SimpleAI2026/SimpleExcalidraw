/**
 * Re-exports from the vendored SimpleChat browser build.
 * Rebuild: cd ../SimpleChat && yarn build:min
 */
export {
  SC_WIDTH_MIN,
  SC_WIDTH_MAX,
  SC_WIDTH_DEFAULT,
  SC_WIDTH_STORAGE_KEY,
  clampSidebarWidth,
  loadSidebarWidth,
  saveSidebarWidth,
  SimpleChatElement,
} from "./simplechat.min.js";
