import {Request, Response, NextFunction} from "express";
import cloudinary from "cloudinary";
import axios from "axios";

import {catchAsyncErrors} from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import {createCourse, getAllCoursesService} from "../services/course.service";
import CourseModel from "../models/course.model";
import {redis} from "../utils/redis";
import mongoose from "mongoose";
import ejs from "ejs"; 
import path from "path";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";


//upload course
export const uploadCourse=catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data=req.body;
        const thumbnail=data.thumbnail;
        if(thumbnail) {
            const myCloud=await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "Courses"
            });
            data.thumbnail={
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            }
        }

        createCourse(data, res, next);
    } catch(error: any) {
        next(new ErrorHandler(error.message, 500))
    }
});

//edit course
export const editCourse = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data=req.body;
        const thumbnail=data.thumbnail;

        const courseId=req.params.id;

        const courseData = await CourseModel.findById(courseId) as any;

        if(thumbnail && !thumbnail.startsWith("https")) {
            await cloudinary.v2.uploader.destroy(courseData.thumbnail.public_id);

            const myCloud=await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail={
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            }
        }

        if (thumbnail.startsWith("https")) {
            data.thumbnail = {
                public_id: courseData?.thumbnail.public_id,
                url: courseData?.thumbnail.url,
            };
        }

        const course=await CourseModel.findByIdAndUpdate(courseId, {
            $set: data
        }, {
            new: true
        });

        res.status(201).json({
            success: true,
            message: "Course Updated Successfully",
            course
        });

    } catch(error: any) {
        next(new ErrorHandler(error.message, 500))
    }
});

//get single course --- without purchasing
export const getSingleCourse=catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const courseId=req.params.id;

        const isCacheExist=await redis.get(courseId);

        if(isCacheExist) {
            const course=JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course
            });
        } else {
            const course=await CourseModel.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestion -courseData.comments -courseData.links");

            await redis.set(courseId, JSON.stringify(course), 'EX', 604800); //7days

            res.status(200).json({
                success: true,
                course,
            });
        }

    } catch(error: any) {
        next(new ErrorHandler(error.message, 500))
    }
});

//get all course --- without purchasing
export const getAllCourse=catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const isCacheExist=await redis.get("allCourses");

        if(isCacheExist) {
            const courses=JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                courses,
            });
        } else {
            const courses=await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.comments -courseData.links");

            await redis.set("allCourses", JSON.stringify(courses));

            res.status(200).json({
                success: true,
                courses,
            });
        }

    } catch(error: any) {
        next(new ErrorHandler(error.message, 500))
    }
});

//get course content -- only for valid user
export const getCourseByUser=catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList=req.user?.courses;
        const courseId=req.params.id;
        const courseExists=userCourseList?.find((course: any) => course._id.toString()===courseId)

        if(!courseExists) {
            return next(new ErrorHandler("You are not eligible to access this course", 404));
        }

        const course=await CourseModel.findById(courseId);

        const content=course?.courseData;

        res.status(200).json({
            success: true,
            content
        });

    } catch(error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

//add comment in course
interface IAddCommentData {
    comment: string;
    courseId: string;
    contentId: string;
}

export const addComment=catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {comment, courseId, contentId}: IAddCommentData=req.body;
        const course=await CourseModel.findById(courseId);

        if(!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid content id", 400));
        }

        const courseContent=course?.courseData?.find((item: any) => item._id.equals(contentId));

        if(!courseContent) {
            return next(new ErrorHandler("Invalid content id", 400))
        }

        const newComment: any={
            user: req.user,
            comment,
            commentReplies: [],
        };

        //add this comment to our course content
        courseContent.comments.push(newComment);

        await NotificationModel.create({
            user: req.user?._id,
            title: "New Comment Received",
            message: `You have a new comment in ${courseContent.title}`
        });

        //save the updated course
        await course?.save();

        res.status(200).json({
            success: true,
            course
        })

    } catch(error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

//add answer in course comment
interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    commentId: string;
}

export const addAnswer = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { answer, courseId, contentId, commentId } : IAddAnswerData = req.body;
        const course = await CourseModel.findById(courseId);

        if(!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid content id", 400));
        }

        const courseContent=course?.courseData?.find((item: any) => item._id.equals(contentId));

        if(!courseContent) {
            return next(new ErrorHandler("Invalid content id", 400))
        }

        const comment = courseContent?.comments?.find((item: any) => item._id.equals(commentId));

        if (!comment) {
            return next(new ErrorHandler("Invalid comment id", 400));
        }

        //create a new answer object
        const newAnswer: any = {
            user: req.user,
            answer,
        }

        //add this answer to our course content
        comment.commentReplies?.push(newAnswer);

        await course?.save();

        if (req.user?._id === comment.user._id) {
            await NotificationModel.create({
                user: req.user?._id,
                title: "New comment reply received",
                message: `You have a new comment reply in ${courseContent.title}`
            });
        } else {
            const data = {
                name: comment.user.name,
                title: courseContent.title,

            }

            const html = await ejs.renderFile(path.join(__dirname, "../mails/comment-mail.ejs"), data);

            try {
                await sendMail({
                    email: comment.user.email,
                    subject: 'comment reply',
                    template: 'comment-mail.ejs',
                    data
                })
            } catch (error: any) {
                next(new ErrorHandler(error.message, 500));
            }
        }        

        res.status(200).json({
            success: true,
            course,
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

//add review rating course
interface IRating {
    review: string,
    rating: number,
    userId: string,
}

export const addReview = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        
        const userCourseList = req.user?.courses;
        const { review, rating } = req.body as IRating;
        const courseId = req.params.id;

        const courseExists = userCourseList?.some(
            (course: any) => course._id.toString() === courseId.toString()
        );

        if (!courseExists) {
            return next(
                new ErrorHandler("You are not eligible to access this course", 404)
            );
        }

        const course = await CourseModel.findById(courseId);

        const reviewData: any = {
            user: req.user,
            rating,
            comment: review,
        }

        course?.reviews.push(reviewData);
        
        let avg = 0;

        course?.reviews.forEach((rev: any) => {
            avg = rev.rating;
        });

        if (course) {
            course.ratings = avg / course.reviews.length; 
            //one exam have 2 reviews one is 5 another one is 4 so math working like this = 9 / 2 = 4.5 ratings
        }
    
        await course?.save();

        const notifycation = {
            title: "new reviews received",
            message: `${req.user?.name} has given a review in ${course?.name}`
        }

        res.status(200).json({
            success: true,
            course
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

//add reply in review
interface IReplyReview {
    comment: string,
    courseId: string,
    reviewId: string,
}

export const addReplyToReview = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        
        const { comment, courseId, reviewId } = req.body as IReplyReview;
        const course = await CourseModel.findById(courseId);    
    
        if (!course) {
            return next(new ErrorHandler('Course not found', 404));
        }

        const review = course?.reviews.find((rev: any) => rev._id.toString()===reviewId);

        if (!review) {
            return next(new ErrorHandler('Review not found', 404));
        }

        const replyData: any = {
            user: req.user,
            comment,
        }

        if (review.commentReplies) {
            review.commentReplies = [];
        }

        review.commentReplies.push(replyData);
        
        await course.save();

        res.status(200).json({
            success: true,
            course
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// get all course --- only for admin
export const getAdminAllCourses = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCoursesService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Delete Course --- only for admin
export const deleteCourse = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const course = await CourseModel.findById(id);

      if (!course) {
        return next(new ErrorHandler("course not found", 404));
      }

      await course.deleteOne({ id });

      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "course deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// generate Video URL
export const generateVideoUrl = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.body;
      const response = await axios.post(
        `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
        { ttl: 300 },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);