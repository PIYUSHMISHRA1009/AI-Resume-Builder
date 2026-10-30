import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION || "resume_embeddings";

async function main() {
  try {
    const collections = await client.getCollections();

    const exists = collections.collections.some(
      (collection) => collection.name === COLLECTION_NAME
    );

    if (exists) {
      console.log(`⚠️ Collection already exists: ${COLLECTION_NAME}`);
      return;
    }

    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 3072,
        distance: "Cosine",
      },
    });

    console.log("✅ Qdrant collection created!");
    console.log(`Collection: ${COLLECTION_NAME}`);
    console.log("Dimensions: 3072");
    console.log("Distance: Cosine");
  } catch {
    console.error("❌ Failed to create Qdrant collection");
    process.exit(1);
  }
}

main();
