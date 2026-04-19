import { describe, expect, it } from "vitest";

import { toSrtTimestamp, serializeCaptionsToSrt } from "@/lib/video/captions";

describe("caption serialization", () => {
  it("formats millisecond timestamps as srt timecodes", () => {
    expect(toSrtTimestamp(3723405)).toBe("01:02:03,405");
  });

  it("serializes caption segments to srt", () => {
    expect(
      serializeCaptionsToSrt([
        {
          startMs: 0,
          endMs: 1500,
          text: "第一句"
        },
        {
          startMs: 1500,
          endMs: 3200,
          text: "第二句"
        }
      ])
    ).toBe(
      [
        "1",
        "00:00:00,000 --> 00:00:01,500",
        "第一句",
        "",
        "2",
        "00:00:01,500 --> 00:00:03,200",
        "第二句"
      ].join("\n")
    );
  });
});
