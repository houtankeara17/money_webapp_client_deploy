/**
 * Convert amountUSD to user's preferred display currency
 * rates: { exchangeRateKhr, exchangeRateThb } from user
 */
export function fromUSD(amountUSD, currency, rates = {}) {
  const n = Number(amountUSD) || 0;
  const khr = rates.exchangeRateKhr || 4100;
  const thb = rates.exchangeRateThb || 36.5;
  if (currency === "KHR") return n * khr;
  if (currency === "THB") return n * thb;
  return n;
}

export function formatMoney(amountUSD, displayCurrency = "USD", rates = {}) {
  const value = fromUSD(amountUSD, displayCurrency, rates);
  const symbols = { USD: "$", KHR: "៛", THB: "฿" };
  const symbol = symbols[displayCurrency] || "";
  const decimals = displayCurrency === "KHR" ? 0 : 2;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (displayCurrency === "USD") return `$${formatted}`;
  if (displayCurrency === "KHR") return `${formatted}៛`;
  if (displayCurrency === "THB") return `฿${formatted}`;
  return `${formatted} ${displayCurrency}`;
}

/** Format original amount + currency as stored */
export function formatOriginal(amount, currency) {
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: currency === "KHR" ? 0 : 2,
    maximumFractionDigits: currency === "KHR" ? 0 : 2,
  });
  if (currency === "USD") return `$${formatted}`;
  if (currency === "KHR") return `${formatted}៛`;
  if (currency === "THB") return `฿${formatted}`;
  return `${formatted} ${currency}`;
}
