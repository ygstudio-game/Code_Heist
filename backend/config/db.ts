import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || "");
        console.log(`📡 Monolith Database Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Database Failure: ${error}`);
        process.exit(1); // Exit process with failure
    }
};

export default connectDB;