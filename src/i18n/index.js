/**
 * Translation key management
 * ---------------------------
 * Source of truth: ./translations.js  (en + km)
 *
 * Key conventions:
 *   appName, dashboard, ...     → nav / chrome
 *   addExpense, save, cancel    → actions
 *   label_Emergency             → enum labels (spaces → _)
 *   month_1 .. month_12         → month names
 *
 * Usage:
 *   const { t, tEnum, tMonth } = useI18n();
 *   t("dashboard")
 *   tEnum("Buy Item")   // → label_Buy_Item
 *   tMonth(7)           // → July / កក្កដា
 *
 * DB values stay in English; only display is translated.
 */
export {
  translations,
  t,
  tEnum,
  tMonth,
  tMonthShort,
  tPeriod,
  hasKey,
  getMissingKeys,
  listKeys,
} from "./translations";
