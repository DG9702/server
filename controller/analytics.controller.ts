import { NextFunction, Request, Response } from 'express';
import { catchAsyncErrors } from '../middleware/catchAsyncErrors';
import {
    generateCurrentYearCourseEnrollments,
    getCourseByIDEnrollmentData,
    generateLast12MonthsRevenueData,
    generateLast12MothsData
} from '../utils/analytics.generator';
import userModel from '../models/user.model';
import ErrorHandler from '../utils/ErrorHandler';
import CourseModel from '../models/course.model';
import orderModel from '../models/order.model';

// get users analytics --- only for admin
export const getUsersAnalytics = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const users = await generateLast12MothsData(userModel);

            res.status(200).json({
                success: true,
                users
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// get courses analytics --- only for admin
export const getCoursesAnalytics = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courses = await generateLast12MothsData(CourseModel);

            res.status(200).json({
                success: true,
                courses
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// get courses analytics --- only for admin
export const getEnrollCoursesAnalytics = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const revenues = await generateLast12MonthsRevenueData(CourseModel);

            res.status(200).json({
                success: true,
                revenues
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

export const generateYearCourseEnrollments = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courses = await generateCurrentYearCourseEnrollments(
                orderModel
            );

            res.status(200).json({
                success: true,
                courses
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

export const getCurrentYearCourseEnrollmentsByID = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courseId = req.params.id;
            const course = CourseModel.findById(courseId);

            if (!course) {
                return next(new ErrorHandler('Course not found', 404));
            }
            const content = await getCourseByIDEnrollmentData(
                orderModel,
                courseId
            );

            res.status(200).json({
                success: true,
                content
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);
// get order analytics --- only for admin
export const getOrderAnalytics = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orders = await generateLast12MothsData(orderModel);

            res.status(200).json({
                success: true,
                orders
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

interface FormattedResult {
    [monthYear: string]: {
        courseId: string;
        name: string;
        count: number;
    }[];
}

export const getCourseOrderCountByMonth = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
            const pipeline = [
                {
                    $match: {
                        createdAt: { $gte: twelveMonthsAgo }
                    }
                },
                {
                    $group: {
                        _id: '$courseId',
                        totalOrders: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'courses',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'course'
                    }
                },
                {
                    $unwind: '$course'
                },
                {
                    $project: {
                        _id: 0,
                        courseId: '$_id',
                        courseName: '$course.name',
                        totalOrders: 1
                    }
                }
            ];

            const results = await orderModel.aggregate(pipeline);

            res.status(200).json({
                success: true,
                results
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);
