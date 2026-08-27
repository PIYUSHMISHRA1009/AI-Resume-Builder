import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on("connected", () => {
            console.log("Database Connected Successfully");
        });

        let mongodbURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/resume-builder";
        // Clean leading/trailing quotes or semicolons from env string
        mongodbURI = mongodbURI.replace(/^["']|["'];?$/g, "").trim();

        try {
            await mongoose.connect(mongodbURI, { dbName: "resume-builder" });
        } catch (primaryErr) {
            console.warn("Primary MongoDB connection failed (" + primaryErr.message + ").");
            if (!mongodbURI.includes("127.0.0.1") && !mongodbURI.includes("localhost")) {
                console.log("Attempting local MongoDB fallback (mongodb://127.0.0.1:27017/resume-builder)...");
                await mongoose.connect("mongodb://127.0.0.1:27017/resume-builder");
            } else {
                throw primaryErr;
            }
        }
    } catch (error) {
        console.error("MongoDB connection warning:", error.message || error);
        console.log("Application continuing in standalone/SQLite mode...");
    }
};

export default connectDB;