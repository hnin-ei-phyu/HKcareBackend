import jwt from 'jsonwebtoken'

// Doctor authentication middleware
const authDoctor = async (req, res, next) => {
    try {
        let dtoken = req.headers.authorization || req.headers.dtoken;
        if (!dtoken) {
            return res.json({success:false, message: "Not Authorized Login Again"})
        }
        
        
        const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);

        //safer place to attach userId
        req.docId = token_decode.id

        next()

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export default authDoctor