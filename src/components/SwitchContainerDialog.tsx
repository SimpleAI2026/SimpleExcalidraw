import React, { useState } from "react";
import { t } from "../i18n";
import { AppState } from "../types";
import "./ExportDialog.scss";
import { ActionManager } from "../actions/manager";
import { Dialog } from "./Dialog";
import {
  getContainerListFromStorage,
  getContainerNameFromStorage,
} from "../excalidraw-app/data/localStorage";
import { requestContainerChange } from "../excalidraw-app/data/containerLifecycle";
import { List, Popconfirm, message } from "antd";
import { CheckSquareOutlined, CloseCircleOutlined } from "@ant-design/icons";

export const SwitchSceneDialog = ({
  appState,
  setAppState,
}: {
  appState: AppState;
  setAppState: React.Component<any, AppState>["setState"];
  actionManager: ActionManager;
}) => {
  const handleClose = React.useCallback(() => {
    setAppState({ openDialog: null });
  }, [setAppState]);

  // Force list refresh after in-app delete/new without full reload.
  const [listVersion, setListVersion] = useState(0);
  const containerList = React.useMemo(() => {
    void listVersion;
    return getContainerListFromStorage();
  }, [listVersion]);

  React.useEffect(() => {
    const bump = () => setListVersion((v) => v + 1);
    window.addEventListener("simpleexcalidraw:container-change-applied", bump);
    return () => {
      window.removeEventListener(
        "simpleexcalidraw:container-change-applied",
        bump,
      );
    };
  }, []);

  const currentContainerName = appState.name || getContainerNameFromStorage();

  const handleDelete = (scene: string) => {
    const listBefore = getContainerListFromStorage();
    if (listBefore.length <= 1) {
      message.warning(t("canvasError.canvasLastCannotDelete"));
      return;
    }

    requestContainerChange({ type: "delete", name: scene });
  };

  return (
    <>
      {appState.openDialog === "switchScene" && (
        <Dialog onCloseRequest={handleClose} title={t("buttons.switchScene")}>
          <List>
            {containerList?.map((scene: string) => {
              return (
                <List.Item
                  key={scene}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 10,
                    borderBottom: `1px solid var(--default-border-color)`,
                  }}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    style={{
                      flex: "auto",
                      cursor: "pointer",
                      color:
                        currentContainerName === scene
                          ? "var(--color-primary)"
                          : "var(--text-primary-color)",
                    }}
                    onClick={() => {
                      if (scene === currentContainerName) {
                        handleClose();
                        return;
                      }
                      requestContainerChange({ type: "switch", name: scene });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).click();
                      }
                    }}
                  >
                    {currentContainerName === scene ? (
                      <CheckSquareOutlined
                        style={{
                          marginRight: 10,
                          color: "var(--color-primary)",
                        }}
                      />
                    ) : null}
                    {scene}
                  </span>
                  <Popconfirm
                    title={t("other.deleteCanvasConfirm", { name: scene })}
                    onConfirm={() => handleDelete(scene)}
                    disabled={containerList.length <= 1}
                  >
                    <CloseCircleOutlined
                      aria-label={t("other.deleteCanvasConfirm", {
                        name: scene,
                      })}
                      style={{
                        display: "block",
                        flex: 0,
                        width: 20,
                        opacity: containerList.length <= 1 ? 0.35 : 1,
                        cursor:
                          containerList.length <= 1 ? "not-allowed" : "pointer",
                      }}
                    />
                  </Popconfirm>
                </List.Item>
              );
            })}
          </List>
        </Dialog>
      )}
    </>
  );
};
