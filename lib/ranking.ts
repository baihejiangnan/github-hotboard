import { isAfter, subDays } from "date-fns";

import type { QueryInput, RankedRepository } from "@/lib/types";

export function rankNewHot(candidates: RankedRepository[], input: QueryInput) {
  const windowStart = subDays(new Date(), input.windowDays);

  return candidates
    .filter((candidate) => isAfter(candidate.createdAt, windowStart))
    .sort((left, right) => {
      if (right.totalStars !== left.totalStars) {
        return right.totalStars - left.totalStars;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .slice(0, input.limit);
}

export function rankGrowth(candidates: RankedRepository[], input: QueryInput) {
  return candidates
    .sort((left, right) => {
      const leftGain = left.starGain ?? 0;
      const rightGain = right.starGain ?? 0;

      if (rightGain !== leftGain) {
        return rightGain - leftGain;
      }

      return right.totalStars - left.totalStars;
    })
    .slice(0, input.limit)
    .map((repo) => ({
      ...repo,
      starsPerDay: Number(((repo.starGain ?? 0) / input.windowDays).toFixed(2))
    }));
}

