import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    
    fullname:{
        type: String,
    },
    username: { 
        type: String, 
        required: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    verificationCode: String,

    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    }, 
},
{
    timestamps: true
});

const User = mongoose.model('user', userSchema);

export default User;