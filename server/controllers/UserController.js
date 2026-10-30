import User from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Resume from "../models/Resume.js"

const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )
}


//controller for user registration
//POST:/api/users/register
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        //check if required fields are present

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Missing Required Fields" })
        }

        const user = await User.findOne({ email })
        if (user) {
            return res.status(400).json({ message: "User Already Exists" })
        }

        //create new User
        const hashedPassword = await bcrypt.hash(password, 10)
        const newUser = await User.create({
            name, email, password: hashedPassword
        })

        const token = generateToken(newUser._id)
        newUser.password = undefined;

        // send response
        res.status(201).json({
            success: true,
            user: newUser,
            token,
            message: "User Created Successfully"
        })

    } catch {
        res.status(500).json({ message: "Internal server error" })
    }
}


//controller for user login
//POST: /api/users/login

export const LoginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // check if user exists
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: "Invalid Email or Password" })
        }

        //check if password is correct
        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Email or Password" })
        }

        //return success message
        const token = generateToken(user._id)
        user.password = undefined;

        return res.status(200).json({ message: 'Login Successful', token, user })

    } catch {
        res.status(500).json({ message: "Internal server error" })
    }
}

//controller for getting user by id
//GET: /api/users/data

export const getUserById = async (req, res) => {
    try {
        const userId=req.userId;

        //Check if user exists
        const user=await User.findById(userId)
        if(!user){
            return res.status(404).json({message:'User not found'})
        }

        //return user
        user.password=undefined;
        return res.status(200).json({user})

    } catch {
        res.status(500).json({ message: "Internal server error" })
    }
}



//Controller for getting user resumes
//GET:/api/users/resumes

export const getUserResumes=async(req,res)=>{
    try{
        const userId=req.userId;


        //return user resumes
        const resumes=await Resume.find({userId})
        return res.status(200).json({resumes})

    }catch {
        res.status(500).json({ message: "Internal server error" })
    }
}
