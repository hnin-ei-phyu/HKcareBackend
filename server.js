import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import adminRouter from './routes/adminRoute.js'
import doctorRouter from './routes/doctorRoute.js'
import userRouter from './routes/userRoute.js'

//app config
dotenv.config()

const app = express()
const port = process.env.PORT || 4000

// check env keys
console.log("OMISE_SECRET_KEY:", process.env.OMISE_SECRET_KEY)
console.log("OMISE_PUBLIC_KEY:", process.env.OMISE_PUBLIC_KEY)

connectDB()
connectCloudinary()

//middlewares
app.use(express.json()) //for  application/json
app.use(express.urlencoded({extended: true})) //for form submissions
app.use(cors())



//api endpoints
app.use('/api/admin', adminRouter)
app.use('/api/doctor', doctorRouter)
app.use('/api/user', userRouter)

//localhost:4000/api/admin
app.get('/', (req,res) => {
    res.send('API IS WORKING!')
})

app.listen(port, () => console.log("Server Started", port)
)

