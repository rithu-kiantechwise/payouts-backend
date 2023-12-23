import { organizationModel } from "../models/organizationModel.js";

export async function verifyUserStatus(req, res, next) {
    const userId = req.user.id;

    const organization = await organizationModel.findById(userId);
    if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
    }

    if (organization.premium.subscriptionEndDate < new Date()) {
        return res.status(403).json({ success: false, error: "Premium subscription has expired." });
    }
    if (organization.freeTrial.endDate < new Date()) {
        return res.status(403).json({ success: false, error: "Free Trail has expired." });
    }

    next();
};