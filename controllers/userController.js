import validator from 'validator'
import bcrypt from 'bcryptjs'
import userModel from '../models/userModel.js'
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary'




// API to register user
const registerUser = async (req, res) => { 
    try {
        const { name, email, password } = req.body;
        if (!name || !password || !email) { 
            return res.json({success:false, message:"Missing details!"})
        }

        //validating email format
        if (!validator.isEmail(email)) { 
            return res.json({ success: false, message: "Enter a valid email!" })
        }

        //validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Enter a strong password!"})
        }

        //hashing user password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = { name, email, password: hashedPassword }
        //saving user data to db
        const newUser = new userModel(userData)
        const user = await newUser.save() //saving user to db

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
        res.json({ success: true, token})



    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API for user login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: "User does not exist!" })
        } 

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({success: true, token})
        } else { 
            res.json({success: false, message: "Incorrect password!"})
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API to get user data
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id; // changed
        const userData = await userModel.findById(userId).select('-password')

        res.json({ success: true, data: userData })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API to update user profile
const updateProfile = async (req, res) => {
    try {
        
        const userId = req.user.id
        const { name, phone, address, dob, gender } = req.body
        const imageFile = req.file 

        if ( !name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing!" })
        }

        // Find the user first
        const user = await userModel.findById(userId);
        if (!user) {
        return res.status(404).json({ success: false, message: "User not found!" });
        }

        //update basic info
        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender },
            { new: true }
        )

        if (imageFile) {
            //upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' })

            //save image url to user data 
            await userModel.findByIdAndUpdate(userId, {
                image: imageUpload.secure_url,
                imagePublicId: imageUpload.public_id
            })
        }

        res.json({
            success: true,
            message: "Profile Updated Successfully!"
        })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API for remove userphoto
const removePhoto = async (req, res) => {
    try {
        const userId = req.user.id
        const user = await userModel.findById(userId)

        if (!user) {
        return res.status(404).json({ success: false, message: "User not found or may have been deleted." });
        }
        
        //Reset and set default image after removing user photo
        user.image = '';
        await user.save();

        res.json({ success: true, message: "Photo removed successfully!" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}


export { registerUser, loginUser, getProfile, updateProfile, removePhoto }