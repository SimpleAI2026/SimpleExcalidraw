import React, { useState } from "react";
import { ToolButton } from "./ToolButton";
import { AnimateApp } from "../animate/AnimateApp";
import { t } from "../i18n";
import { useExcalidrawElements } from "./App";
import { message } from "antd";

const PlayIcon = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

export const AnimateButton = () => {
  const [open, setOpen] = useState(false);
  const elements = useExcalidrawElements();
  const isEmpty = !elements?.length;

  return (
    <>
      <ToolButton
        type="icon"
        title={t("other.animatePlay")}
        aria-label={t("other.animatePlay")}
        icon={PlayIcon}
        className={isEmpty ? "disabled" : undefined}
        onClick={() => {
          if (isEmpty) {
            message.info(t("other.animateEmptyDisabled"));
            return;
          }
          setOpen(true);
        }}
      />
      {open && !isEmpty && (
        <AnimateApp open={open} onCancel={() => setOpen(false)} />
      )}
    </>
  );
};
