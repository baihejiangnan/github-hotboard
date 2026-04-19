import { registerWorkers, syncSavedQuerySchedules } from "@/lib/jobs";

async function main() {
  await registerWorkers();
  await syncSavedQuerySchedules();
  // eslint-disable-next-line no-console
  console.log("GitHub Hotboard worker is running.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

