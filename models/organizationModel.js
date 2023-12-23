import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    address: String,
    location: String,
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phoneNumber: String,
    employees: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'employees',
        },
    ],
    token: {
        type: String,
        default: null,
    },
    imageUrl: String,
    isBlocked: {
        type: Boolean,
        default: false,
    },
    freeTrial: {
        startDate: Date,
        endDate: Date,
        isActive: {
            type: Boolean,
            default: false,
        },
    },
    premium: {
        isActive: {
            type: Boolean,
            default: false,
        },
        subscriptionStartDate: Date,
        subscriptionEndDate: Date,
        subscriptionAmount: {
            type: Number,
            default: 50,
        },
    },
},
    { timestamps: true },
);

export const organizationModel = mongoose.model('organization', organizationSchema);