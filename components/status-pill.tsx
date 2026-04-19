type StatusKind = "ok" | "warn" | "neutral";

export function StatusPill({ label, kind = "neutral" }: { label: string; kind?: StatusKind }) {
  const className =
    kind === "ok" ? "badge good" : kind === "warn" ? "badge warn" : "badge";

  return <span className={className}>{label}</span>;
}

