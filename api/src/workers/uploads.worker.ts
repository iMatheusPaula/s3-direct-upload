import { consumeUploads } from "@/modules/uploads/uploads.consumer";

try {
  await consumeUploads();
} catch (error) {
  console.error("failed to start uploads worker:", error);
  process.exitCode = 1;
}
