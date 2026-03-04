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
        address: {
            line1: { type: String, default: "" },
            line2: { type: String, default: "" },
            city: { type: String, default: "" },
            state: { type: String, default: "" },
            pincode: { type: String, default: "" },
            country: { type: String, default: "India" },
            phone: { type: String, default: "" },
        },
        savedAuctions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "auction",
            },
        ],
},
{
    timestamps: true
});

const User = mongoose.model('user', userSchema);

export default User;