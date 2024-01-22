import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    title: String,
    content: String,
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employees',
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'organization',
    },
    status: {
        type: Boolean,
        default: false,
    }
},
    { timestamps: true },
);

export const notificationModel = mongoose.model('notification', notificationSchema);