import mongoose from 'mongoose';

async function connect() {
    try {
        mongoose.set('strictQuery', true);
        const db = await mongoose.connect(process.env.MONGO_URI);
        console.log("Database Connected");
        return db;
    } catch (error) {
        console.error("Error connecting to the database:", error);
        throw error;
    }
}

export default connect;