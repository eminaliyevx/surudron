import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  onClose: () => void;
}

export function InstructionsModal({ onClose }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"map" | "forms" | "control">(
    "map"
  );

  const keyStyle = "px-1 py-0.5 bg-gray-200 rounded border text-xs font-mono";

  const renderTabContent = () => {
    switch (activeTab) {
      case "map":
        return (
          <ul className="list-disc space-y-2 pl-5">
            <li>{t("instructions.map.one")}</li>
            <li>
              <Trans
                components={{ key: <kbd className={keyStyle} /> }}
                i18nKey="instructions.map.two"
              />
            </li>
            <li>
              <Trans
                components={{
                  undo: <kbd className={keyStyle} />,
                  redo: <kbd className={keyStyle} />,
                }}
                i18nKey="instructions.map.three"
              />
            </li>
            <li>{t("instructions.map.four")}</li>
            <li>{t("instructions.map.five")}</li>
          </ul>
        );
      case "forms":
        return (
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <Trans
                components={{
                  icons: (
                    <span className="inline-flex gap-1">
                      <span className={keyStyle}>.</span>
                      <span className={keyStyle}>△</span>
                      <span className={keyStyle}>▢</span>
                      <span className={keyStyle}>☆</span>
                      <span className={keyStyle}>⬡</span>
                    </span>
                  ),
                }}
                i18nKey="instructions.forms.one"
              />
            </li>
            <li>{t("instructions.forms.two")}</li>
            <li>{t("instructions.forms.three")}</li>
          </ul>
        );
      case "control":
        return (
          <ul className="list-disc space-y-2 pl-5">
            <li>{t("instructions.control.one")}</li>
            <li>
              <Trans
                components={{
                  drones: <span className={keyStyle} />,
                  destinations: <span className={keyStyle} />,
                }}
                i18nKey="instructions.control.two"
              />
            </li>
            <li>{t("instructions.control.three")}</li>
            <li>{t("instructions.control.four")}</li>
            <li>
              <Trans
                components={{
                  settings: <span className={keyStyle} />,
                  destinations: <span className={keyStyle} />,
                }}
                i18nKey="instructions.control.five"
              />
            </li>
            <li>
              <Trans
                components={{
                  camera: <span className={keyStyle} />,
                  destinations: <span className={keyStyle} />,
                }}
                i18nKey="instructions.control.six"
              />
            </li>
          </ul>
        );

      default:
        return (
          <div>{t("instructions.default") || "No instructions available."}</div>
        );
    }
  };

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="glow-text font-mono text-primary">
            {t("instructions.title")}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="mb-3 flex space-x-2 border-border border-b">
          {(["map", "forms", "control"] as const).map((tab) => (
            <button
              className={`rounded-t-md px-3 py-1 font-medium ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "bg-secondary text-secondary-foreground"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {t(`instructions.${tab}.title`)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-3 text-lg text-secondary-foreground">
          {renderTabContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
