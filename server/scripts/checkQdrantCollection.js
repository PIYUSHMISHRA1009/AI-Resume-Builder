import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION || "resume_embeddings";

async function main() {
  try {
    const info = await client.getCollection(COLLECTION_NAME);

    console.log("✅ Collection verified");
    console.log(JSON.stringify(info, null, 2));
  } catch {
    console.error("❌ Could not read collection");
    process.exit(1);
  }
}

main();
