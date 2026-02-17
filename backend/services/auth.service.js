import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const secret = process.env.JWT_SECRET;

// generate jwt token
export function setUser (user) {
    
    return jwt.sign(
        { _id: user._id, email: user.email },
        secret,
        { expiresIn: "7d" }
    );
}

// verify jwt token
export function getUser (token) {

    if(!token) return null;

    return jwt.verify(token, secret);
}

// generate hash password
export function generateHashPassword(password) {
  const saltRounds = Number(process.env.SALT_ROUNDS);
  return bcrypt.hash(password, saltRounds);
}