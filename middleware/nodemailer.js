import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_KEY,
    },
});

export const sendMail = async (to, subject, text) => {
    const mailOptions = {
        from: `${process.env.EMAIL_NAME} <${process.env.EMAIL_ID}>`,
        to,
        subject,
        text,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return { success: true, message: 'OTP email sent successfully.' };
    } catch (error) {
        console.error('Error sending email:', error.message);
        return { success: false, message: 'Failed to send OTP email.' };
    }
};
