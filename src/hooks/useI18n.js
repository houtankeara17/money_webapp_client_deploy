import { useTheme } from "../store/ThemeContext";
import {
  t as translate,
  tEnum as translateEnum,
  tMonth as translateMonth,
  tMonthShort as translateMonthShort,
  tPeriod as translatePeriod,
  hasKey,
  getMissingKeys,
  listKeys,
} from "../i18n/translations";

/**
 * App-wide i18n hook.
 * - t(key)           → UI string
 * - tEnum(value)     → enum/category label (DB value stays English)
 * - tMonth(1..12)    → localized month name
 */
export function useI18n() {
  const { language } = useTheme();
  const lang = language || "en";

  const t = (key) => translate(key, lang);
  const tEnum = (value) => translateEnum(value, lang);
  const tMonth = (n, opts) => translateMonth(n, lang, opts);
  const tMonthShort = (n) => translateMonthShort(n, lang);
  const tPeriod = (unit) => translatePeriod(unit, lang);

  return {
    t,
    tEnum,
    tMonth,
    tMonthShort,
    tPeriod,
    language: lang,
    hasKey: (key) => hasKey(key, lang),
    getMissingKeys,
    listKeys: () => listKeys(lang),
  };
}

export default useI18n;
