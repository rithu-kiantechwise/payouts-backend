import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    token: {
        type: String,
    },
    imageUrl: String,
    token: {
        type: String,
        sparse: true,
    },
},
    { timestamps: true },
);

export const adminModel = mongoose.model('admins', adminSchema);