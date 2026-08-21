import { X } from "lucide-react";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
} from "react";
import useFocusTrap from "../../hooks/useFocusTrap";

const ModalContext = createContext({
  onClose: () => {},
  showClose: true,
  titleId: undefined,
});

function sizeClass(size, wide) {
  if (size === "sm") return "max-w-sm";
  if (size === "lg" || wide) return "max-w-2xl";
  if (size === "xl") return "max-w-4xl";
  if (size === "full") return "max-w-5xl";
  return "max-w-md";
}

/**
 * Compound Modal with custom focus trap + Escape
 *
 * <Modal open onClose size="lg">
 *   <Modal.Header>Title</Modal.Header>
 *   <Modal.Body>...</Modal.Body>
 *   <Modal.Footer>...</Modal.Footer>
 * </Modal>
 */
function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  size,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = true,
  className = "",
  initialFocusRef,
  restoreFocus = true,
}) {
  const titleId = useId();
  const panelRef = useFocusTrap(open, {
    initialFocusRef,
    restoreFocus,
  });

  // Escape — capture phase so only the topmost open modal closes
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key !== "Escape" && e.key !== "Esc") return;
      if (!closeOnEscape) return;
      e.preventDefault();
      e.stopPropagation();
      onClose?.();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose, closeOnEscape]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const childArray = Children.toArray(children);
  const isCompound = childArray.some(
    (c) =>
      isValidElement(c) &&
      (c.type === Header || c.type === Body || c.type === Footer),
  );

  return (
    <ModalContext.Provider value={{ onClose, showClose, titleId }}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        role="presentation"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={closeOnBackdrop ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Modal Content Panel - Notice relative z-10 added */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`relative z-10 w-full ${sizeClass(size, wide)} max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl outline-none ${className}`}
          style={{ animation: "mfModalIn 0.18s ease-out" }}
          onClick={(e) => e.stopPropagation()}
        >
          {isCompound ? (
            children
          ) : (
            <>
              {title ? <Header>{title}</Header> : null}
              <Body>{children}</Body>
            </>
          )}
        </div>
      </div>

      <style>{`
      @keyframes mfModalIn {
        from { opacity: 0; transform: scale(0.96) translateY(8px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
    `}</style>
    </ModalContext.Provider>
  );
}

function Header({ children, className = "" }) {
  const { onClose, showClose, titleId } = useContext(ModalContext);
  return (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 ${className}`}
    >
      <h2
        id={titleId}
        className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
      >
        {children}
      </h2>
      {showClose !== false && (
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition shrink-0"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function Body({ children, className = "" }) {
  return (
    <div className={`px-5 py-4 overflow-y-auto flex-1 min-h-0 ${className}`}>
      {children}
    </div>
  );
}

function Footer({ children, className = "" }) {
  return (
    <div
      className={`px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 ${className}`}
    >
      {children}
    </div>
  );
}

Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
export { Header as ModalHeader, Body as ModalBody, Footer as ModalFooter };
