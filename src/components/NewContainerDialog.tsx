import React, { useState } from "react";
import { t } from "../i18n";
import { AppState } from "../types";
import { Dialog } from "./Dialog";
import "./ExportDialog.scss";
import { ActionManager } from "../actions/manager";
import { Button } from "./Button";
import { message } from "antd";
import {
  getContainerListFromStorage,
  setContainerListToStorage,
  validateContainerName,
} from "../excalidraw-app/data/localStorage";
import { requestContainerChange } from "../excalidraw-app/data/containerLifecycle";

export const NewSceneDialog = ({
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

  const [newContainerName, setNewContainerName] = useState(
    `canvas-${Date.now()}`,
  );

  const showValidationError = (reason: string) => {
    if (reason === "empty") {
      message.error(t("canvasError.canvasNameEmpty"));
    } else if (reason === "duplicate") {
      message.error(
        `${newContainerName.trim()} ${t("canvasError.canvasRepeat")}`,
      );
    } else {
      message.error(t("canvasError.canvasNameInvalid"));
    }
  };

  return (
    <>
      {appState.openDialog === "newScene" && (
        <Dialog onCloseRequest={handleClose} title={t("buttons.newScene")}>
          <input
            type="text"
            placeholder={t("labels.inputNewContainerName")}
            style={{
              minWidth: "90%",
              maxWidth: "100%",
            }}
            defaultValue={newContainerName}
            onChange={(e) => {
              setNewContainerName(e.target.value);
            }}
          />
          <Button
            style={{
              whiteSpace: "nowrap",
              padding: "0 20px",
              marginTop: 10,
              minWidth: 100,
              maxWidth: 200,
              backgroundColor: "var(--color-primary)",
              color: "#fff",
            }}
            onSelect={() => {
              const containerList: string[] = getContainerListFromStorage();
              const validation = validateContainerName(newContainerName, {
                existingNames: containerList,
              });
              if (!validation.ok) {
                showValidationError(validation.reason);
                return;
              }

              // Write empty elements first, then append the name.
              // If either fails, roll back so the list never keeps a hollow name.
              try {
                localStorage.setItem(validation.name, JSON.stringify([]));
              } catch (error) {
                console.error(error);
                message.error(t("other.storageQuotaExceeded"));
                return;
              }
              try {
                setContainerListToStorage([...containerList, validation.name]);
              } catch (error) {
                console.error(error);
                try {
                  localStorage.removeItem(validation.name);
                } catch {
                  // ignore
                }
                message.error(t("other.storageQuotaExceeded"));
                return;
              }

              requestContainerChange({ type: "new", name: validation.name });
            }}
          >
            {t("buttons.confirm")}
          </Button>
        </Dialog>
      )}
    </>
  );
};
