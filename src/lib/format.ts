export const formatDeadline = (value: string) => {
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
};

export type ErrandPaymentMethod = "cash_on_delivery" | "e_wallet" | "bank_transfer";

export const formatPaymentMethod = (method?: string, legacyCod?: boolean) => {
  if (method === "cash_on_delivery") return "Cash on delivery";
  if (method === "e_wallet") return "E-wallet (GCash/Maya)";
  if (method === "bank_transfer") return "Bank transfer";
  return legacyCod ? "Cash on delivery" : "Not specified";
};
