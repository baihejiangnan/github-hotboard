function readErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return Reflect.get(error, field);
}

export function isQuotaOrBalanceError(error: unknown) {
  const status = readErrorField(error, "status");
  const code = String(readErrorField(error, "code") ?? "");
  const errorPayload = readErrorField(error, "error");
  const errorCode =
    errorPayload && typeof errorPayload === "object"
      ? String(Reflect.get(errorPayload, "code") ?? "")
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = `${message} ${code} ${errorCode}`.toLowerCase();

  return (
    status === 429 &&
    (normalized.includes("insufficient balance") ||
      normalized.includes("no resource package") ||
      normalized.includes("insufficient_quota") ||
      normalized.includes("exceeded your current quota") ||
      normalized.includes("1113"))
  );
}
