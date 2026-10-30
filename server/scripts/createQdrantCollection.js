import "dotenv/config";
import { initQdrant } from "../services/vectorStore/index.js";

try {
  await initQdrant();
  console.log("Qdrant collection bootstrap completed");
} catch {
  console.error("Qdrant collection bootstrap failed");
  process.exitCode = 1;
}
