import "dotenv/config";
import app from "./app.js";
import connectDB from "./configs/db.js";
import { VECTOR_STORE, initQdrant } from "./services/vectorStore/index.js";

await connectDB();

if (VECTOR_STORE !== "mongodb") {
  initQdrant().catch((error) => {
    console.error("[Qdrant] Initialization failed:", error.message);
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is Running on Port ${PORT}`);
});
