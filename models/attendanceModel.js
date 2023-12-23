import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employees',
        required: true,
    },
    checkInTime: {
        type: Date
    },
    checkOutTime: {
        type: Date
    },
},
    { timestamps: true },
);

export const attendanceModel = mongoose.model('attendance', attendanceSchema);