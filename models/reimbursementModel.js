import mongoose from "mongoose";

const reimbursementSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employees',
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    imageUrl: String,
},
    { timestamps: true },
);

export const reimbursementModel = mongoose.model('reimbursement', reimbursementSchema);