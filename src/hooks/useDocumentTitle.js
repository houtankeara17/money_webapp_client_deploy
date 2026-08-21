import { useEffect } from "react";

/**
 * Set browser tab title: "Page — MoneyFlow"
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title
      ? `${title} MoneyFlow`
      : "MoneyFlow — Personal Finance OS";
    return () => {
      document.title = prev;
    };
  }, [title]);
}
