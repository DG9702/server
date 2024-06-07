import express from "express";
import {createOrder, getAllOrders} from "../controller/order.controller";
import {authorizeRoles, isAutheticated} from "../middleware/auth";
const orderRouter = express.Router();

orderRouter.post('/create-order', isAutheticated, createOrder);

orderRouter.get(
  "/get-orders",
  isAutheticated,
  authorizeRoles("admin"),
  getAllOrders
);

export default orderRouter;