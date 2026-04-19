import { analyzeImageWithArk } from "@/lib/ai/ark";

function readArg(index: number) {
  return process.argv[index]?.trim();
}

async function main() {
  const imageUrl = readArg(2) || process.env.ARK_DEMO_IMAGE_URL;
  const prompt = readArg(3) || process.env.ARK_DEMO_PROMPT || "你看见了什么？";
  const model = readArg(4) || process.env.ARK_VISION_MODEL;

  if (!imageUrl) {
    throw new Error(
      "缺少图片地址。请传入 imageUrl 参数，或设置 ARK_DEMO_IMAGE_URL。"
    );
  }

  const output = await analyzeImageWithArk(imageUrl, prompt, model);

  console.log(
    JSON.stringify(
      {
        ok: true,
        model: model || process.env.ARK_VISION_MODEL || "default",
        imageUrl,
        prompt,
        output
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[ark:vision]", error instanceof Error ? error.message : error);
  process.exit(1);
});
