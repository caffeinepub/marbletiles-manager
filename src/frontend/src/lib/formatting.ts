export function formatINR(paise: bigint): string {
  const rupees = Number(paise) / 100;
  return `\u20B9${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(time: bigint): string {
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(time: bigint): string {
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function rupeesToPaise(rupeesStr: string): bigint {
  const val = Number.parseFloat(rupeesStr);
  if (Number.isNaN(val)) return 0n;
  return BigInt(Math.round(val * 100));
}
