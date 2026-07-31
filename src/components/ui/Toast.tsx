import { RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function Toast({
  message,
  canUndo,
  onUndo,
  onDismiss,
}: {
  message: string | null;
  canUndo: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
      {canUndo && (
        <button type="button" onClick={onUndo}>
          <RotateCcw size={14} />
          {t("toast.undo")}
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label={t("toast.dismiss")}>
        <X size={14} />
      </button>
    </div>
  );
}
