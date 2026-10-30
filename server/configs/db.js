import mongoose from "mongoose";

const LOCAL_MONGODB_URI = "mongodb://127.0.0.1:27017/resume-builder";
const CONNECTION_OPTIONS = {
    dbName: "resume-builder",
    // Fail quickly when Atlas DNS or network access is unavailable, then use the
    // explicitly supported local-development fallback.
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
};

const connectDB = async () => {
    try {
        mongoose.connection.once("connected", () => {
            console.log("Database Connected Successfully");
        });

        let mongodbURI = process.env.MONGODB_URI || LOCAL_MONGODB_URI;
        // Clean leading/trailing quotes or semicolons from env string
        mongodbURI = mongodbURI.replace(/^["']|["'];?$/g, "").trim();

        try {
            await mongoose.connect(mongodbURI, CONNECTION_OPTIONS);
        } catch (primaryErr) {
            console.warn("Primary MongoDB connection failed.");
            if (!mongodbURI.includes("127.0.0.1") && !mongodbURI.includes("localhost")) {
                console.log(`Attempting local MongoDB fallback (${LOCAL_MONGODB_URI})...`);
                await mongoose.connect(LOCAL_MONGODB_URI, CONNECTION_OPTIONS);
            } else {
                throw primaryErr;
            }
        }
    } catch (error) {
        console.error("MongoDB connection warning: connection unavailable");
        console.log("Application continuing in standalone/SQLite mode...");
    }
};

export default connectDB;
