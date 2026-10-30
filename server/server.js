import "dotenv/config";
import app from "./app.js";
import connectDB from "./configs/db.js";
import { VECTOR_STORE, initQdrant } from "./services/vectorStore/index.js";

await connectDB();

if (VECTOR_STORE !== "mongodb") {
  initQdrant().catch(() => {
    console.warn("[Qdrant] Initialization failed; MongoDB retrieval fallback is active.");
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is Running on Port ${PORT}`);
});
