import jwt from 'jsonwebtoken';

const generateTokenSetCookie = (userId, role,res) => {
   const token = jwt.sign({ userId, role }, process.env.JWT_SECRET,{
 
    expiresIn: '1week'
   });

   res.cookie("jwt",token,{
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week in milliseconds
    httpOnly: true, // Ensures the cookie can only be accessed via HTTP requests
    sameSite: "strict", // Ensures the cookie can only be accessed
    secure: process.env.NODE_ENV  ===" production",//ookie over HTTPS in production
    domain: new URL(process.env.FRONTEND_URL).hostname,//set the domain hereeeee
    });

    return token;
};

export default generateTokenSetCookie;