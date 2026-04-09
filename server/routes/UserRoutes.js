import express from 'express';
import { registerUser, LoginUser, getUserById,getUserResumes } from "../controllers/UserController.js";
import protect from "../middlewares/authMiddleware.js";

const userRouter= express.Router();

userRouter.post('/register',registerUser);
userRouter.post('/login',LoginUser);
userRouter.get('/data',protect,getUserById);
userRouter.get('/resumes',protect,getUserResumes)



export default userRouter;


