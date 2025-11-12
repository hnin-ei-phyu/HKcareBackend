import validator from 'validator'
import bcrypt from 'bcryptjs'
import userModel from '../models/userModel.js'
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary'
import doctorModel from '../models/doctorModel.js'
import appointmentModel from '../models/appointmentModel.js'
import omiseModule from 'omise'




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
        user.image = null;
        await user.save();

        res.json({ success: true});
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

//Api to book appointment
const bookAppointment = async (req, res) => {
    try {

        const { userId, docId, slotDate, slotTime } = req.body

        const docData = await doctorModel.findById(docId).select('-password')
        //find doctor if available
        if (!docData.available) {
            return res.json({ success: false, message: "Doctor not Available!" })
        }

        let slots_booked = docData.slots_booked

        //checking for slot availability
        if (slots_booked[slotDate]) {
        if (slots_booked[slotDate].includes(slotTime)) {
            return res.json({ success: false, message: "Slot not Available!" });
        } else {
            slots_booked[slotDate].push(slotTime);
        }
        } else {
        slots_booked[slotDate] = [slotTime]; // only once
        }


        const userData = await userModel.findById(userId).select('-password')

        delete docData.slots_booked

        //create appointmentData
        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()           
        }
        //save data in db
        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        //update and save slots_booked data in docData
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })
        res.json({ success: true, message: "Appointment Booked Successfully!" })
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}


//API to get user appointments for frontend my-appointmentes Page
const listAppointment = async (req, res) => {
    try {
        const userId = req.user.id
        const appointments = await appointmentModel.find({ userId })
        res.json({ success: true, appointments });
        
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

//API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {
         const userId = req.user.id;         // from token
        const { appointmentId } = req.body; // from frontend body
        const appointmentData = await appointmentModel.findById(appointmentId)

        //verify appointment user
        if (appointmentData.userId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Unauthorized Action!"})
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        //releasing doctor slot
        const { docId, slotDate, slotTime } = appointmentData
        const docData = await doctorModel.findById(docId)
        let slots_booked = docData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })
        res.json({ success: true, message: "Appointment Cancelled Successfully!" })
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}
        


//API for online payment #using Omise for payment method
const paymentOmise = async (req, res) => {
    
    try {
        
        // Initialize Omise (ESM compatible)
        const omise = omiseModule({
            publicKey: process.env.OMISE_PUBLIC_KEY,
            secretKey: process.env.OMISE_SECRET_KEY
        
        });

        const { appointmentId, token } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);

        if (!appointmentData || appointmentData.cancelled) {
        return res.json({ success: false, message: "Appointment cancelled or not found!" });
        }
        

        const charge = await omise.charges.create({
            amount: appointmentData.amount * 100, // satang
            currency: process.env.CURRENCY,
            card: token,
            description: `Payment for appointment ${appointmentId}`,
            metadata: {
                receipt: appointmentId
            }
        });

    if (charge.status === "successful") {
        // send charge.id back to frontend
        return res.json({ success: true, chargeId: charge.id, message: "Payment successful" }, charge);
    } else {
        return res.json({ success: false, message: "Payment failed", charge });
    }

        
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//API to verify payment of Omisepayment
const verifyPayment = async (req, res) => {
    // Initialize Omise (ESM compatible)
    const omise = omiseModule({
        publicKey: process.env.OMISE_PUBLIC_KEY,
        secretKey: process.env.OMISE_SECRET_KEY
    
    });
   
    const { chargeId } = req.body


    try {
        //Retrieve the Charge object from Omise to check its final status
        const verifiedCharge = await omise.charges.retrieve(chargeId);

        // Retrieve your appointmentId from metadata
        const appointmentId = verifiedCharge.metadata?.receipt;

        if (verifiedCharge.status === 'successful') {
            await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true })
            res.json({success: true, message: "Payment Successful!"})
        } else {
            res.json({ success: false, message: "Payment Failed!"})
        }
       
        
        
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}


export { registerUser, loginUser, getProfile, updateProfile, removePhoto, bookAppointment, listAppointment, cancelAppointment, paymentOmise, verifyPayment }