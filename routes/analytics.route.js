"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const analytics_controller_1 = require("../controller/analytics.controller");
const analyticsRouter = express_1.default.Router();
analyticsRouter.get('/get-users-analytics', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getUsersAnalytics);
analyticsRouter.get('/get-orders-analytics', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getOrderAnalytics);
analyticsRouter.get('/get-course-orders-analytics', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getCourseOrderCountByMonth);
analyticsRouter.get('/get-revenue-analytics', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getEnrollCoursesAnalytics);
analyticsRouter.get('/get-enroll-year-course-analytics', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.generateYearCourseEnrollments);
analyticsRouter.get('/get-courses-analytics', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getCoursesAnalytics);
analyticsRouter.get('/get-course-enroll/:id', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getCurrentYearCourseEnrollmentsByID);
exports.default = analyticsRouter;
