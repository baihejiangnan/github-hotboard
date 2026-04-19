import { formatISO9075, subDays } from "date-fns";

import type { QueryInput } from "@/lib/types";

export interface BuiltSearchQuery {
  key: "high_star" | "new_window" | "active_window";
  query: string;
  sort: "stars" | "updated";
}

function normalizeKeyword(keyword?: string) {
  const value = keyword?.trim();
  return value ? value : "stars:>50";
}

function buildQualifierList(input: QueryInput, windowStart: Date) {
  const qualifiers = [];

  if (input.excludeForks) qualifiers.push("fork:false");
  if (input.excludeArchived) qualifiers.push("archived:false");
  if (input.language) qualifiers.push(`language:${input.language}`);
  if (input.topic) qualifiers.push(`topic:${input.topic}`);

  qualifiers.push(`pushed:>=${formatISO9075(windowStart, { representation: "date" })}`);

  return qualifiers;
}

export function buildSearchQueries(input: QueryInput): BuiltSearchQuery[] {
  const windowStart = subDays(new Date(), input.windowDays);
  const windowDate = formatISO9075(windowStart, { representation: "date" });
  const baseKeyword = normalizeKeyword(input.keyword);
  const qualifiers = buildQualifierList(input, windowStart).filter(
    (qualifier) => !qualifier.startsWith("pushed:")
  );

  return [
    {
      key: "high_star",
      sort: "stars",
      query: [baseKeyword, ...qualifiers].join(" ").trim()
    },
    {
      key: "new_window",
      sort: "stars",
      query: [baseKeyword, `created:>=${windowDate}`, ...qualifiers].join(" ").trim()
    },
    {
      key: "active_window",
      sort: "updated",
      query: [baseKeyword, `pushed:>=${windowDate}`, ...qualifiers].join(" ").trim()
    }
  ];
}

