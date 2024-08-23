"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controller/order.controller");
const auth_1 = require("../middleware/auth");
require('dotenv').config();
const orderRouter = express_1.default.Router();
orderRouter.post('/create-order', auth_1.isAutheticated, order_controller_1.createOrder);
orderRouter.get('/get-orders', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), order_controller_1.getAllOrders);
orderRouter.get('/config', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.status(200).json({
        status: 'success',
        data: process.env.CLIENT_PAYPAL_ID
    });
}));
exports.default = orderRouter;
