import express from "express";
import {getNotifications, updateNotification} from "../controller/notification.controller";
import {authorizeRoles, isAutheticated} from "../middleware/auth";

const notificationRouter = express.Router();

notificationRouter.get("/get-all-notification", isAutheticated, authorizeRoles("admin"), getNotifications);
notificationRouter.put("/update-notification/:id", isAutheticated, authorizeRoles("admin"), updateNotification);

export default notificationRouter