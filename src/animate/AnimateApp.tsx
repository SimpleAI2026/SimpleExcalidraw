import React, { useState, useEffect } from "react";
import { Modal } from "antd";
import type { ModalProps } from "antd";
import {
  useExcalidrawAppState,
  useExcalidrawElements,
} from "../components/App";
import { Viewer } from "./Viewer";
import { AnimateConfig } from "./AnimateConfig";
import { t } from "../i18n";
import "./AnimateDialog.scss";

interface AnimateAppProps {
  open: boolean;
  onCancel: () => void;
}

const getExcalidrawContainer = (): HTMLElement => {
  return (
    (document.querySelector(".excalidraw") as HTMLElement | null) ||
    document.body
  );
};

const animateModalStyles: ModalProps["styles"] = {
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
    height: "min(80vh, 720px)",
  },
};

export const AnimateApp: React.FC<AnimateAppProps> = ({ open, onCancel }) => {
  const elements = useExcalidrawElements();
  const appState = useExcalidrawAppState();
  const [duration, setDuration] = useState(10000);
  const [loop, setLoop] = useState(false);
  const [version, setVersion] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 500 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 500);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleReplay = () => {
    setVersion((v) => v + 1);
    setPaused(false);
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={isSmallScreen ? "100%" : "90%"}
      style={
        isSmallScreen
          ? { maxWidth: "100vw", margin: 0, top: 8 }
          : { maxWidth: 1200, top: 20 }
      }
      title={t("other.animateTitle")}
      centered
      className="AnimateModal"
      rootClassName="AnimateModalRoot"
      styles={animateModalStyles}
      maskClosable={false}
      destroyOnHidden
      getContainer={getExcalidrawContainer}
    >
      <div className="AnimateModal__body">
        <div className="AnimateModal__viewer">
          <Viewer
            elements={elements}
            appState={appState}
            duration={duration}
            loop={loop}
            version={version}
            paused={paused}
          />
        </div>
        <div className="AnimateModal__config">
          <AnimateConfig
            duration={duration}
            setDuration={setDuration}
            loop={loop}
            setLoop={setLoop}
            onReplay={handleReplay}
            paused={paused}
            setPaused={setPaused}
          />
        </div>
      </div>
    </Modal>
  );
};
