import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    
    name: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        required: true
    },
    condition: { 
        type: String, 
        enum: ["new", "like new", "good", "fair"],
        required: true
    },
    description: { 
        type: String 
    },
    images: [{ type: String }]  
});

const Product = mongoose.model("product", productSchema);

export default Product;