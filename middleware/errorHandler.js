export const createCustomError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err.statusCode) {
        res.status(err.statusCode).json({success: false, message: err.message });
    } else {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
