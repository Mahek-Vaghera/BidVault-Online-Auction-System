import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    
    userId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    auctionId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auction'
    },
    amount: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['PENDING', 'SUCCESS', 'PAID', 'FAILED'], 
        required: true
    },
    type: {
        type: String,
        enum: ['REGISTRATION_FEES', 'WINNING_PAYMENT', 'BUY_IT_NOW_PAYMENT']
    },
    metadata: { 
        type: Object 
    },
},
{ 
    timestamps: true 
});

const Payment = mongoose.model('Payment', PaymentSchema);

export default Payment;