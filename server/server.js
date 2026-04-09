import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import userRouter from "./routes/UserRoutes.js";
import aiRouter from "./routes/aiRoutes.js";
import resumeRouter from "./routes/resumeRoutes.js";

//Database Connection

await connectDB()

const app= express();
const PORT=process.env.PORT || 3000;

app.use(express.json())
app.use(cors())


app.get('/',(req,res)=>res.send("Server is Live..."))

app.use('/api/users',userRouter);


app.use('/api/ai',aiRouter)


app.use('/api/resumes', resumeRouter);


app.listen(PORT,()=>{
    console.log(`Server is Running on Port ${PORT}`);
})