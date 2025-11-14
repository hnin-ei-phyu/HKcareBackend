import doctorModel from "../models/doctorModel.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import appointmentModel from "../models/appointmentModel.js"




const changeAvailability = async (req, res) => { 
    try {
        
        const { docId } = req.body
        const docData = await doctorModel.findById(docId)
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({success:true, message:"Availability Changed"})

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//function for get all doctors for frontend
const doctorList = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select(['-password', '-email'])
        res.json({success:true, doctors})
    } catch (error) {
        console.log(error);
        res.json({success:false, message:error.message})
    }
}

//API for doctor login
const loginDoctor = async (req, res) => {
    try {

        const { email, password } = req.body
        const doctor = await doctorModel.findOne({ email })
        
        if (!doctor) {
            return res.json({ success: false, message: "Invalid Credentials"})
        }

        const isMatch = await bcrypt.compare(password, doctor.password)

        if (isMatch) {
            const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET)
            res.json({success: true, token})
        } else {
            res.json({ success: false, message: "Invalid Credentials"})
        }
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
    
}


//API for get all appointments for specific doctor
const appointmentsDoctor = async (req, res) => {
    try {
        const docId = req.docId; 
        const appointments = await appointmentModel.find({ docId })
        
        res.json({ success: true, appointments})
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API to mark appointments completed for doctorPanel
const appointmentComplete = async (req, res) => {
    try {
        const docId = req.docId 
        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (appointmentData && appointmentData.docId.toString() === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })
            return res.json({ success: true, message: "Appoitment Completed!"})
        } else {
            return res.json({ success: false, message: "Mark Failed!"})
        }
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API to cancel appointments for doctorPanel
const appointmentCancel = async (req, res) => {
    try {
        const docId = req.docId 
        const { appointmentId } = req.body  
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (appointmentData && appointmentData.docId.toString() === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
            return res.json({ success: true, message: "Appoitment cancelled!"})
        } else {
            return res.json({ success: false, message: "Cancellation Failed!"})
        }
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API to get dashboard data for DoctorPanel
const doctorDashboard = async (req, res) => {
    try {
        const docId = req.docId 
        const appointments = await appointmentModel.find({ docId })
        
        let earnings = 0

        appointments.map((item) => {
            if (item.isCompleted || item.payment) {
                earnings += item.amount
            }
        })
        //GET TOTAL PATIENTS FOR EACH DOCTOR
        // let patients = []
        // appointments.map((item) => {
        //     if (!patients.includes(item.userId)) {
        //         patients.push(item.userId )
        //     }
        // })

        //Create a Set to automatically store only unique IDs
        const uniquePatientIds = new Set(appointments.map(item => item.userId))

        const dashData = {
            earnings,
            appointments: appointments.length,
            // patients: patients.length,
            patients: uniquePatientIds.size,
            latestAppointments: appointments.reverse().slice(0,5)
        }

        res.json({ success: true, dashData })
        
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API to get doctor profile for Doctor Panel
const doctorProfile = async (req, res) => {
    try {
        const docId = req.docId
        const profileData = await doctorModel.findById(docId).select('-password')
        


        res.json({success:true, profileData})
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}


// API to update doctor profile data from Doctor Panel
const updateDoctorProfile = async (req, res) => {
    try {
        const docId = req.docId
        const { fees, address, available } = req.body

        await doctorModel.findByIdAndUpdate(docId, { fees, address, available })
        res.json({ success: true, message: "Profile Updated!"})
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

export {
    changeAvailability,
    doctorList,
    loginDoctor,
    appointmentsDoctor,
    appointmentComplete,
    appointmentCancel,
    doctorDashboard,
    doctorProfile,
    updateDoctorProfile
}