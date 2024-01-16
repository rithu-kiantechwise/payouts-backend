import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    startTime: {
        type: String,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    endTime: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected','Cancelled'],
        default: 'Pending',
    },
},
    { timestamps: true },
);

export const leaveModel = mongoose.model('leave', leaveSchema);