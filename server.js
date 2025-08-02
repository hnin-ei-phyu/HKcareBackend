import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import adminRouter from './routes/adminRoute.js'

//app config
dotenv.config()
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

//middlewares
app.use(express.json()) //for  application/json
app.use(express.urlencoded({extended: true})) //for form submissions
app.use(cors())



//api endpoints
app.use('/api/admin', adminRouter)
//localhost:4000/api/admin

app.get('/', (req,res) => {
    res.send('API IS WORKING!')
})

app.listen(port, () => console.log("Server Started", port)
)

