import bcrypt from 'bcrypt';
import { organizationModel } from "../../models/organizationModel.js";

export const getAllOrganization = async (req, res, next) => {
    const { page } = req.query;
    try {
        const limit = 10;
        const totalOrganizations = await organizationModel.countDocuments();
        const totalPages = Math.ceil(totalOrganizations / limit);

        const currentPage = parseInt(page, 10) || 1;
        const startIndex = (currentPage - 1) * limit;
        const endIndex = currentPage * limit;

        const organizations = await organizationModel.find().skip(startIndex).limit(limit);
        organizations.reverse();

        return res.status(200).json({
            success: true,
            currentPage,
            totalItems: totalOrganizations,
            totalPages,
            organizations,
        });
    } catch (error) {
        next(error);
    }
};

export const blockOrganization = async (req, res, next) => {
    const { OrganizationId } = req.body;
    try {
        const isBlocked = true;
        const organization = await organizationModel.findByIdAndUpdate(
            OrganizationId,
            { isBlocked },
            { new: true }
        );
        if (!organization) {
            return { success: false, message: 'Organization not found' };
        }

        return res.status(200).json({ success: true, message: 'Organization blocked successfully' });
    } catch (error) {
        next(error);
    }
};

export const unblockOrganization = async (req, res, next) => {
    const { OrganizationId } = req.body;
    try {
        const isBlocked = false;
        const organization = await organizationModel.findByIdAndUpdate(
            OrganizationId,
            { isBlocked },
            { new: true }
        );
        if (!organization) {
            return { success: false, message: 'Organization not found' };
        }

        return res.status(200).json({ success: true, message: 'Organization unblocked successfully' });
    } catch (error) {
        next(error);
    }
};

export const addNewOrganization = async (req, res, next) => {
    const { name, email, password, phoneNumber, location, accountType } = req.body;
    try {
        const existingOrganization = await organizationModel.findOne({ email });
        if (existingOrganization) {
            return res.status(400).json({ success: false, message: 'Organization with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let freeTrial = null;
        let premium = null;

        if (accountType === 'freeTrial') {
            const currentDate = new Date();
            const trialEndDate = new Date(currentDate);
            trialEndDate.setDate(currentDate.getDate() + 14);
            freeTrial = {
                startDate: currentDate,
                endDate: trialEndDate,
                isActive: true,
            };
        } else if (accountType === 'premium') {
            const currentDate = new Date();
            const subscriptionEndDate = new Date(currentDate);
            subscriptionEndDate.setMonth(currentDate.getMonth() + 1);
            premium = {
                isActive: true,
                subscriptionStartDate: currentDate,
                subscriptionEndDate: subscriptionEndDate,
                subscriptionAmount: 50,
            };
        }
        const organizationData = {
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            location,
            freeTrial,
            premium,
        };
        const newOrganization = new organizationModel(organizationData);
        const savedOrganization = await newOrganization.save();
        return res.status(200).json({ success: true, message: 'Organization added successfully', data: savedOrganization });
    } catch (error) {
        next(error);
    }
};