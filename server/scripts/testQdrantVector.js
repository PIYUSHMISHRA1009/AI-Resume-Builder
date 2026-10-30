import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION || "resume_embeddings";

async function main() {
  try {
    // Deterministic test vector
    const vector = Array.from(
      { length: 3072 },
      (_, index) => (index % 100) / 100
    );

    await client.upsert(COLLECTION_NAME, {
      points: [
        {
          id: 1,
          vector,
          payload: {
            type: "test",
            source: "qdrant-connectivity-test",
            text: "This is a Qdrant test document.",
          },
        },
      ],
    });

    console.log("✅ Test vector inserted");

    const result = await client.query(COLLECTION_NAME, {
      query: vector,
      limit: 1,
      with_payload: true,
    });

    console.log("✅ Test vector retrieved");
    console.log(JSON.stringify(result.points, null, 2));
  } catch (error) {
    console.error("❌ Qdrant vector test failed");
    console.error(error);
    process.exit(1);
  }
}

main();