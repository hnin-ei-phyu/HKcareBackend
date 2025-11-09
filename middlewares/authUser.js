import jwt from 'jsonwebtoken'

// User authentication middleware
const authUser = async (req, res, next) => {
    try {
        let token = req.headers.authorization || req.headers.token;
        if (!token) {
            return res.json({success:false, message: "Not Authorized Login Again"})
        }
        
        
        if (token.startsWith("Bearer ")) {
        token = token.slice(7);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //safer place to attach userId
        req.user = { id: decoded.id };

        next()

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export default authUser