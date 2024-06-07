import {NextFunction, Request, Response} from "express";
import {catchAsyncErrors} from "../middleware/catchAsyncErrors";
import {generateLast12MothsData} from "../utils/analytics.generator";
import userModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import orderModel from "../models/order.model";


// get users analytics --- only for admin
export const getUsersAnalytics = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await generateLast12MothsData(userModel);

      res.status(200).json({
        success: true,
        users,
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
          courses,
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
          orders,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  );