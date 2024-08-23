import express from 'express';
import { authorizeRoles, isAutheticated } from '../middleware/auth';
import {
    generateYearCourseEnrollments,
    getCourseOrderCountByMonth,
    getCoursesAnalytics,
    getCurrentYearCourseEnrollmentsByID,
    getEnrollCoursesAnalytics,
    getOrderAnalytics,
    getUsersAnalytics
} from '../controller/analytics.controller';

const analyticsRouter = express.Router();

analyticsRouter.get(
    '/get-users-analytics',
    isAutheticated,
    authorizeRoles('admin'),
    getUsersAnalytics
);

analyticsRouter.get(
    '/get-orders-analytics',
    isAutheticated,
    authorizeRoles('admin'),
    getOrderAnalytics
);
analyticsRouter.get(
    '/get-course-orders-analytics',
    isAutheticated,
    authorizeRoles('admin'),
    getCourseOrderCountByMonth
);

analyticsRouter.get(
    '/get-revenue-analytics',
    isAutheticated,
    authorizeRoles('admin'),
    getEnrollCoursesAnalytics
);

analyticsRouter.get(
    '/get-enroll-year-course-analytics',
    isAutheticated,
    authorizeRoles('admin'),
    generateYearCourseEnrollments
);

analyticsRouter.get(
    '/get-courses-analytics',
    isAutheticated,
    authorizeRoles('admin'),
    getCoursesAnalytics
);

analyticsRouter.get(
    '/get-course-enroll/:id',
    isAutheticated,
    authorizeRoles('admin'),
    getCurrentYearCourseEnrollmentsByID
);

export default analyticsRouter;
