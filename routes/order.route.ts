import express from 'express';
import {
    createOrder,
    getAllOrders,
    newPayment
} from '../controller/order.controller';
import { authorizeRoles, isAutheticated } from '../middleware/auth';
import axios from 'axios';
require('dotenv').config();
const orderRouter = express.Router();

orderRouter.post('/create-order', isAutheticated, createOrder);

orderRouter.get(
    '/get-orders',
    isAutheticated,
    authorizeRoles('admin'),
    getAllOrders
);

orderRouter.get('/config', async (req, res) => {
    return res.status(200).json({
        status: 'success',
        data: process.env.CLIENT_PAYPAL_ID
    });
});

export default orderRouter;
