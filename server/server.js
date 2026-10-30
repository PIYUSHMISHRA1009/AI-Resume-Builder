import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import userRouter from "./routes/UserRoutes.js";
import aiRouter from "./routes/aiRoutes.js";
import resumeRouter from "./routes/resumeRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";
import optimizerRouter from "./routes/optimizerRoutes.js";
import optimizerUploadRouter from "./routes/optimizerUploadRoutes.js";

await connectDB()

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy violation"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get('/', (req, res) => res.send("Server is Live..."))

app.use('/api/users', userRouter);
app.use('/api/ai', aiRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/analytics', optimizerRouter);
app.use('/api/optimizer', optimizerUploadRouter);

app.listen(PORT, () => {
    console.log(`Server is Running on Port ${PORT}`);
})