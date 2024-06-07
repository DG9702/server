require('dotenv').config();
import mongoose, {Document, Model, Schema} from "mongoose";

export interface IOrder extends Document {
    userId: string,
    courseId: string,
    payment_info: object,
}

const orderSchema: Schema<IOrder> = new mongoose.Schema({
    courseId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    payment_info: {
        type: Object,
    }
}, {timestamps: true});

const orderModel: Model<IOrder> = mongoose.model("Order", orderSchema);

export default orderModel;