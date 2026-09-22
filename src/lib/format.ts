export const formatDeadline = (value: string) => {
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
};