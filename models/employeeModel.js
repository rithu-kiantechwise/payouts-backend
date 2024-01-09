import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'organization',
        required: true,
    },
    employeeID: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
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
    phoneNumber: {
        type: String,
        required: true,
    },
    dob: {
        type: Date,
        required: true,
    },
    salary: {
        type: String,
        required: true,
    },
    position: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        sparse: true,
    },
    imageUrl: String,
    pf: {
        type: Number,
        default: 0,
    },
    esi: {
        type: Number,
        default: 0,
    },
    tax: {
        type: Number,
        default: 0,
    },
    bonus: {
        type: Number,
        default: 0,
    },
    bankAccount: {
        accountHolderName: {
            type: String,
            required: true,
        },
        accountNumber: {
            type: String,
            required: true,
        },
        bankName: {
            type: String,
            required: true,
        },
        branch: {
            type: String,
            required: true,
        },
        IFSCcode: {
            type: String,
            required: true,
        },
        upiId: {
            type: String,
            required: true,
        }
    },
},
    { timestamps: true },
);

export const employeeModel = mongoose.model('employees', employeeSchema);