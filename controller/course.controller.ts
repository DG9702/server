import { Request, Response, NextFunction } from 'express';
import cloudinary from 'cloudinary';
import axios from 'axios';

import { catchAsyncErrors } from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import { createCourse, getAllCoursesService } from '../services/course.service';
import CourseModel, { ICourseData, ITrack } from '../models/course.model';
import { redis } from '../utils/redis';
import mongoose, { ObjectId } from 'mongoose';
import ejs from 'ejs';
import path from 'path';
import sendMail from '../utils/sendMail';
import NotificationModel from '../models/notification.model';
import LessonModel, { ILesson } from '../models/lesson.model';
import QuizModel, { IQuiz } from '../models/quiz.model';

interface ICreateCourseBody {
    name: string;
    description: string;
    categories: string;
    price?: number;
    estimatedPrice?: number;
    thumbnail?: object;
    tags: string;
    level: string;
    demoUrl?: string;
    benefits?: { title: string }[];
    prerequisites?: { title: string }[];
    courseData: { trackId: string; typeTrack: 'lecture' | 'quiz' }[];
}

//upload course
export const uploadCourse = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;

            const thumbnail = data.thumbnail;
            if (thumbnail) {
                const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                    folder: 'courses'
                });

                data.thumbnail = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                };
            }

            const newCourse = new CourseModel({
                name: data.name,
                description: data.description,
                categories: data.categories,
                price: data.price,
                estimatedPrice: data.estimatedPrice,
                thumbnail: data.thumbnail,
                tags: data.tags,
                level: data.level,
                demoUrl: data.demoUrl,
                benefits: data.benefits,
                prerequisites: data.prerequisites,
                courseData: data.courseData.map((section: any) => ({
                    section: section.section,
                    tracks: section.tracks.map((track: any) => ({
                        typeTrack: track.typeTrack,
                        position: track.position,
                        duration: track.duration,
                        title: track.title,
                        trackId: null // Initialize trackId as null
                    }))
                }))
            });

            const createdCourseDataPromises: Promise<any>[] = [];

            // Create lectures and quizzes asynchronously using Promise.all
            for (const courseDataItem of data.courseData) {
                for (let i = 0; i < courseDataItem.tracks.length; i++) {
                    const track = courseDataItem.tracks[i];
                    if (track.typeTrack === 'lesson') {
                        createdCourseDataPromises.push(
                            LessonModel.create({
                                section: courseDataItem.section, // Use section from courseDataItem
                                courseId: newCourse._id,
                                ...track
                            }).then((createdLesson) => {
                                // Update trackId with createdLesson._id
                                track.trackId = createdLesson._id;
                                track.section = courseDataItem?.section;
                                return createdLesson;
                            })
                        );
                    } else if (track.typeTrack === 'quiz') {
                        await createdCourseDataPromises.push(
                            QuizModel.create({
                                courseId: newCourse._id,
                                section: courseDataItem.section, // Use section from courseDataItem
                                ...track
                            }).then((createdQuiz) => {
                                // Update trackId with createdQuiz._id
                                track.trackId = createdQuiz._id;
                                track.section = courseDataItem?.section;
                                return createdQuiz;
                            })
                        );
                    } else {
                        throw new Error('Invalid typeTrack in courseData');
                    }
                }
            }

            const createdCourseData = await Promise.all(
                createdCourseDataPromises
            );

            //console.log('Check createdCourseData: ', createdCourseData);
            newCourse.courseData.map((courseData: any, index: number) => {
                courseData.tracks.map((track: any, trackIndex: number) => {
                    createdCourseData.forEach(
                        (createData, createIndex: number) => {
                            const createPosition = createIndex + 1;
                            if (
                                createData.section === courseData.section &&
                                createData.typeTrack === track.typeTrack &&
                                createPosition === track.position
                            ) {
                                track.trackId = createData._id;
                            }
                        }
                    );
                });
            });

            await newCourse.save();

            res.status(201).json({
                message: 'Course created successfully',
                course: newCourse
            });
        } catch (error: any) {
            next(new ErrorHandler(error.message, 500));
        }
    }
);

//edit course
export const editCourse = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courseId = req.params.id;
            const data = req.body;
            const thumbnail = data.thumbnail;

            const course = (await CourseModel.findById(courseId)) as any;

            if (!course) {
                return next(new ErrorHandler('Course Not found', 404));
            }

            if (thumbnail && !thumbnail?.startsWith('https')) {
                await cloudinary.v2.uploader.destroy(
                    course.thumbnail.public_id
                );

                const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                    folder: 'courses'
                });

                data.thumbnail = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                };
            }

            if (thumbnail.startsWith('https')) {
                data.thumbnail = {
                    public_id: course?.thumbnail.public_id,
                    url: course?.thumbnail.url
                };
            }

            console.log('Check course: ', course);

            // Update course details
            course.name = req.body.name;
            course.description = req.body.description;
            course.categories = req.body.categories;
            course.price = req.body.price;
            course.estimatedPrice = req.body.estimatedPrice;
            course.tags = req.body.tags;
            course.level = req.body.level;
            course.demoUrl = req.body.demoUrl;
            course.benefits = req.body.benefits;
            course.prerequisites = req.body.prerequisites;

            // Update courseData with lectures and quizzes
            const updatedCourseData = req.body.courseData;

            // Loop through each element in courseData
            for (const courseDataItem of updatedCourseData) {
                const { trackId, typeTrack, ...data } = courseDataItem; // Destructure typeTrack and other data
                console.log('Check courseDataItem: ', courseDataItem);

                if (typeTrack === 'lecture') {
                    // Update existing lecture or create new one
                    const lecture = await LessonModel.findByIdAndUpdate(
                        courseDataItem.trackId, // Update if _id exists

                        {
                            $set: data
                        },
                        { new: true, runValidators: true } // Return updated document and validate data
                    );

                    if (!lecture) {
                        // Create new lecture if _id doesn't exist
                        const newLecture = new LessonModel({
                            ...data,
                            courseId // Add courseId to the new lecture
                        });
                        await newLecture.save();

                        course.courseData.push({
                            trackId: newLecture._id,
                            typeTrack: 'lecture'
                        });
                    }
                } else if (typeTrack === 'quiz') {
                    // Update existing quiz or create new one (similar logic as lectures)
                    const quiz = await QuizModel.findByIdAndUpdate(
                        courseDataItem.trackId,
                        {
                            $set: data
                        },
                        { new: true, runValidators: true }
                    );

                    if (!quiz) {
                        const newQuiz = new QuizModel({
                            ...data,
                            courseId // Add courseId to the new quiz
                        });
                        await newQuiz.save();

                        course.courseData.push({
                            trackId: newQuiz._id,
                            typeTrack: 'quiz'
                        });
                    }
                } else {
                    // Handle invalid typeTrack case (throw error or log warning)
                    throw new Error('Invalid typeTrack in courseData');
                }
            }

            await course.save();

            res.status(200).json({
                success: true,
                message: 'Course updated successfully',
                course
            });
        } catch (error: any) {
            next(new ErrorHandler(error.message, 500));
        }
    }
);

//get single course --- without purchasing
export const getSingleCourse = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courseId = req.params.id;

            const isCacheExist = await redis.get(courseId);

            if (isCacheExist) {
                const course = JSON.parse(isCacheExist);
                res.status(200).json({
                    success: true,
                    course
                });
            } else {
                const course = await CourseModel.findById(req.params.id);

                if (!course) {
                    // Handle the case where `course` is null or undefined
                    return next(new ErrorHandler('Course not found', 404));
                }

                const contentCourse = [];
                for (const courseDataItem of course.courseData) {
                    for (const courseDataTrack of courseDataItem.tracks) {
                        const { trackId, typeTrack, ...rest } = courseDataTrack;
                        console.log('Check courseDataItem: ', courseDataItem);

                        console.log('Check courseDataTrack: ', courseDataTrack);

                        let contentData;
                        if (typeTrack === 'lesson') {
                            contentData = await LessonModel.findById(
                                trackId
                            ).select('-videoUrl -suggestion -comments -links');
                        } else if (typeTrack === 'quiz') {
                            contentData = await QuizModel.findById(
                                trackId
                            ).select(
                                '-title -description -content -questions -comments'
                            );
                        }

                        contentCourse.push(contentData);
                    }
                }

                await redis.set(courseId, JSON.stringify(course), 'EX', 604800); //7days

                res.status(200).json({
                    success: true,
                    course,
                    contentCourse
                });
            }
        } catch (error: any) {
            next(new ErrorHandler(error.message, 500));
        }
    }
);

//get all course --- without purchasing
export const getAllCourses = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            getAllCoursesService(res);
        } catch (error: any) {
            next(new ErrorHandler(error.message, 500));
        }
    }
);

//get course content -- only for valid user
export const getCourseByUser = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCourseList = req.user?.courses;
            const courseId = req.params.id;
            const courseExists = userCourseList?.find(
                (course: any) => course._id.toString() === courseId
            );

            if (!courseExists) {
                return next(
                    new ErrorHandler(
                        'You are not eligible to access this course',
                        404
                    )
                );
            }

            const course = await CourseModel.findById(courseId);

            if (!course) {
                // Handle the case where `course` is null or undefined
                return next(new ErrorHandler('Course not found', 404));
            }

            const content = [];
            for (const courseDataItem of course.courseData) {
                for (const courseDataTrack of courseDataItem.tracks) {
                    const { trackId, typeTrack, ...rest } = courseDataTrack;

                    let contentData;
                    if (typeTrack === 'lecture') {
                        contentData = await LessonModel.findById(trackId);
                    } else if (typeTrack === 'quiz') {
                        contentData = await QuizModel.findById(trackId);
                    }

                    content.push(contentData);
                }
            }

            res.status(200).json({
                success: true,
                content: content
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

//add comment in course
interface IAddCommentData {
    comment: string;
    courseId: string;
    trackId: string;
    typeTrack: string;
}

export const addComment = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { comment, courseId, trackId, typeTrack }: IAddCommentData =
                req.body;

            if (!courseId || !trackId) {
                return next(new ErrorHandler('Missing required fields', 400));
            }

            const course = await CourseModel.findById(courseId);

            if (!course) {
                // Handle the case where `course` is null or undefined
                return next(new ErrorHandler('Course not found', 404));
            }

            //const courseContent=course?.courseData?.find((item: any) => item.trackId === trackId);

            //if(!courseContent) {
            //    return next(new ErrorHandler("Invalid content id", 400))
            //}

            const newComment: any = {
                user: req.user,
                comment,
                commentReplies: []
            };

            console.log('Check course.courseData: ', course.courseData);

            let model;
            if (typeTrack === 'lecture') {
                model = await LessonModel.findById(trackId);
            } else if (typeTrack === 'quiz') {
                model = await QuizModel.findById(trackId);
            } else {
                return next(new ErrorHandler('Invalid typeTrack', 400));
            }

            // Check if model exists
            if (!model) {
                return next(new ErrorHandler('Lecture or Quiz not found', 404));
            }

            console.log('Check model: ', model);

            // Update comments array in the model
            model.comments.push(newComment); // Replace with actual user data

            await NotificationModel.create({
                user: req.user?._id,
                title: 'New Comment Received',
                message: `You have a new comment in ${model.title}`
            });

            await model.save();
            // Update comments array in the model

            res.status(200).json({
                success: true,
                message: 'Comment created successfully',
                course,
                model
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

////add answer in course comment
interface IAddAnswerData {
    reply: string;
    courseId: string;
    trackId: string;
    commentId: string;
    typeTrack: string;
}

export const addAnswer = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                reply,
                courseId,
                trackId,
                commentId,
                typeTrack
            }: IAddAnswerData = req.body;
            const course = await CourseModel.findById(courseId);

            if (!mongoose.Types.ObjectId.isValid(trackId)) {
                return next(new ErrorHandler('Invalid content id', 400));
            }

            const courseContent = course?.courseData?.find(
                (item: any) => item.trackId === trackId
            );

            if (!courseContent) {
                return next(new ErrorHandler('Invalid content id', 400));
            }

            let content;
            if (typeTrack === 'lecture') {
                content = await LessonModel.findById(trackId);
            } else if (typeTrack === 'quiz') {
                content = await QuizModel.findById(trackId);
            } else {
                return next(new ErrorHandler('Invalid typeTrack', 400));
            }

            // Check if model exists
            if (!content) {
                return next(new ErrorHandler('Lecture or Quiz not found', 404));
            }

            const commentIndex = content.comments.findIndex(
                (comment: any) => comment._id.toString() === commentId
            );
            if (commentIndex === -1) {
                return next(new ErrorHandler('Comment not found', 404));
            }

            // Add the reply to the comment's replies array
            console.log('Check content: ', content);
            console.log('Check courseContent: ', courseContent);

            console.log('Check commentIndex: ', commentIndex);

            console.log('content[index]: ', content);

            //create a new answer object
            const newAnswer: any = {
                user: req.user,
                reply,
                createdAt: Date.now()
            };

            content.comments[commentIndex].commentReplies?.push(newAnswer);

            await content.save();

            ////add this answer to our course content
            //comment.commentReplies?.push(newAnswer);

            //await course?.save();

            if (req.user?._id === content.comments[commentIndex].user._id) {
                await NotificationModel.create({
                    user: req.user?._id,
                    title: 'New comment reply received',
                    message: `You have a new comment reply in ${content.title}`
                });
            } else {
                const data = {
                    name: content.comments[commentIndex].user.name,
                    title: content.title
                };

                const html = await ejs.renderFile(
                    path.join(__dirname, '../mails/comment-mail.ejs'),
                    data
                );

                try {
                    await sendMail({
                        email: content.comments[commentIndex].user.email,
                        subject: 'comment reply',
                        template: 'comment-mail.ejs',
                        data
                    });
                } catch (error: any) {
                    next(new ErrorHandler(error.message, 500));
                }
            }

            res.status(200).json({
                success: true,
                content
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

//add review rating course
interface IRating {
    review: string;
    rating: number;
    userId: string;
}

export const addReview = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCourseList = req.user?.courses;
            const { review, rating } = req.body as IRating;
            const courseId = req.params.id;

            const courseExists = userCourseList?.some(
                (course: any) => course._id.toString() === courseId.toString()
            );

            if (!courseExists) {
                return next(
                    new ErrorHandler(
                        'You are not eligible to access this course',
                        404
                    )
                );
            }

            const course = await CourseModel.findById(courseId);

            const reviewData: any = {
                user: req.user,
                rating,
                comment: review
            };

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
                title: 'new reviews received',
                message: `${req.user?.name} has given a review in ${course?.name}`
            };

            res.status(200).json({
                success: true,
                course
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

//add reply in review
interface IReplyReview {
    comment: string;
    courseId: string;
    reviewId: string;
}

export const addReplyToReview = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { comment, courseId, reviewId } = req.body as IReplyReview;
            const course = await CourseModel.findById(courseId);

            if (!course) {
                return next(new ErrorHandler('Course not found', 404));
            }

            const review = course?.reviews.find(
                (rev: any) => rev._id.toString() === reviewId
            );

            if (!review) {
                return next(new ErrorHandler('Review not found', 404));
            }

            const replyData: any = {
                user: req.user,
                comment
            };

            if (review.commentReplies) {
                review.commentReplies = [];
            }

            review.commentReplies.push(replyData);

            await course.save();

            res.status(200).json({
                success: true,
                course
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

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
                return next(new ErrorHandler('course not found', 404));
            }

            // Delete associated lectures
            await LessonModel.deleteMany({ courseId: id });

            // Delete associated quizzes
            await QuizModel.deleteMany({ courseId: id });

            await course.deleteOne({ id });

            await redis.del(id);

            res.status(200).json({
                success: true,
                message: 'course deleted successfully'
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
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`
                    }
                }
            );

            res.json(response.data);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);
