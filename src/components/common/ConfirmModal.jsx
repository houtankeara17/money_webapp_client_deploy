import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";
import useI18n from "../../hooks/useI18n";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  loading = false,
}) {
  const { t } = useI18n();

  // Fallback to translated default values inside the component
  const modalTitle = title ?? t("confirm");
  const modalMessage = message ?? t("areYouSure");
  const modalConfirmLabel = confirmLabel ?? t("delete");
  const modalCancelLabel = cancelLabel ?? t("cancel");

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
    >
      <Modal.Header>{modalTitle}</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col items-center text-center gap-4 py-1">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              danger
                ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600"
                : "bg-teal-100 dark:bg-teal-900/40 text-teal-700"
            }`}
          >
            <AlertTriangle size={28} />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {modalMessage}
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          {modalCancelLabel}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onConfirm}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 ${
            danger
              ? "bg-rose-600 hover:bg-rose-500"
              : "bg-teal-700 hover:bg-teal-600"
          }`}
        >
          {loading ? "..." : modalConfirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
