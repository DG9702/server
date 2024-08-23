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
import userModel from '../models/user.model';

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
                categoryId: data.categoryId,
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
                        trackId: null, // Initialize trackId as null,
                        userCompleted: []
                    }))
                })),
                course_creator: data.course_creator
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

//edit course --- Chưa xử lý được xóa hẳn một section
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
                    course?.thumbnail?.public_id
                );

                const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                    folder: 'courses'
                });

                data.thumbnail = {
                    public_id: myCloud?.public_id,
                    url: myCloud?.secure_url
                };
            }

            if (thumbnail?.startsWith('https')) {
                data.thumbnail = {
                    public_id: course?.thumbnail?.public_id,
                    url: course?.thumbnail?.url
                };
            }

            // Update course details
            course.name = req.body.name;
            course.description = req.body.description;
            course.categoryId = req.body.categoryId;
            course.price = req.body.price;
            course.estimatedPrice = req.body.estimatedPrice;
            course.tags = req.body.tags;
            course.level = req.body.level;
            course.demoUrl = req.body.demoUrl;
            course.benefits = req.body.benefits;
            course.prerequisites = req.body.prerequisites;
            course.course_creator = req.body.course_creator;

            const updatedCourseData = req.body.courseData;

            // Update courseData sections
            for (const courseDataItem of updatedCourseData) {
                const foundContent = course.courseData.find(
                    (content: any) =>
                        content._id.toString() === courseDataItem._id
                );

                if (foundContent) {
                    foundContent.section = courseDataItem.section;

                    for (const trackItem of courseDataItem.tracks) {
                        const { trackId, typeTrack, position, ...data } =
                            trackItem; // Destructure typeTrack and other data

                        if (typeTrack === 'lesson') {
                            if (
                                trackItem.trackId &&
                                trackItem.title === '' &&
                                trackItem.description === '' &&
                                trackItem.videoUrl === '' &&
                                trackItem.duration === 0
                            ) {
                                await LessonModel.findByIdAndDelete({
                                    _id: trackId
                                });

                                let deletedTrackIndex =
                                    course.courseData.findIndex(
                                        (section: any) =>
                                            section.tracks.some(
                                                (track: any) =>
                                                    track.trackId ===
                                                    trackItem.trackId
                                            )
                                    );

                                if (deletedTrackIndex !== -1) {
                                    const deletedSection =
                                        course.courseData[deletedTrackIndex];
                                    const deletedTrackIndexInSection =
                                        deletedSection.tracks.findIndex(
                                            (track: any) =>
                                                track.trackId === trackId
                                        );

                                    course.courseData.forEach(
                                        (section: any, i: any) => {
                                            section.tracks.forEach(
                                                (track: any, j: any) => {
                                                    if (
                                                        track.position >
                                                        trackItem.position
                                                    ) {
                                                        track.position =
                                                            track.position - 1;
                                                    }
                                                }
                                            );
                                        }
                                    );
                                }

                                course.courseData = course.courseData.map(
                                    (sectionData: any) => {
                                        return {
                                            ...sectionData,
                                            tracks: sectionData.tracks.filter(
                                                (track: any) =>
                                                    track.trackId !==
                                                    trackItem.trackId
                                            )
                                        };
                                    }
                                );
                            } else {
                                const lesson =
                                    await LessonModel.findByIdAndUpdate(
                                        trackItem.trackId, // Update if _id exists

                                        {
                                            title: data.title,
                                            description: data.description,
                                            section: courseDataItem.section,
                                            videoUrl: data.videoUrl,
                                            duration: data.duration,
                                            links: data.links,
                                            suggestion: data.suggestion
                                        },
                                        { new: true, runValidators: true } // Return updated document and validate data
                                    );

                                if (!lesson) {
                                    const newLesson = new LessonModel({
                                        ...data,
                                        section: courseDataItem.section,
                                        courseId // Add courseId to the new lecture
                                    });
                                    await newLesson.save();

                                    course.courseData.map((data: any) => {
                                        data.tracks.map((item: any) => {
                                            if (item.position >= position) {
                                                item.position =
                                                    item.position + 1;
                                            }
                                        });

                                        if (
                                            data.section === newLesson.section
                                        ) {
                                            data.tracks.push({
                                                typeTrack: 'lesson',
                                                position,
                                                trackId: newLesson._id
                                            });
                                        }
                                    });
                                }
                            }
                            // Update existing lecture or create new one
                        } else if (typeTrack === 'quiz') {
                            // Update existing quiz or create new one (similar logic as lectures)
                            if (
                                trackItem.trackId &&
                                trackItem.title === '' &&
                                trackItem.description === '' &&
                                trackItem.content === '' &&
                                trackItem.duration === 0
                            ) {
                                await QuizModel.findByIdAndDelete({
                                    _id: trackId
                                });

                                let deletedTrackIndex =
                                    course.courseData.findIndex(
                                        (section: any) =>
                                            section.tracks.some(
                                                (track: any) =>
                                                    track.trackId ===
                                                    trackItem.trackId
                                            )
                                    );

                                if (deletedTrackIndex !== -1) {
                                    const deletedSection =
                                        course.courseData[deletedTrackIndex];
                                    const deletedTrackIndexInSection =
                                        deletedSection.tracks.findIndex(
                                            (track: any) =>
                                                track.trackId === trackId
                                        );

                                    course.courseData.forEach(
                                        (section: any, i: any) => {
                                            section.tracks.forEach(
                                                (track: any, j: any) => {
                                                    if (
                                                        track.position >
                                                        trackItem.position
                                                    ) {
                                                        track.position =
                                                            track.position - 1;
                                                    }
                                                }
                                            );
                                        }
                                    );
                                }

                                course.courseData = course.courseData.map(
                                    (sectionData: any) => {
                                        return {
                                            ...sectionData,
                                            tracks: sectionData.tracks.filter(
                                                (track: any) =>
                                                    track.trackId !==
                                                    trackItem.trackId
                                            )
                                        };
                                    }
                                );
                            } else {
                                const quiz = await QuizModel.findByIdAndUpdate(
                                    trackItem.trackId,
                                    {
                                        title: data.title,
                                        description: data.description,
                                        section: courseDataItem.section,
                                        content: data.content,
                                        questions: data.questions,
                                        duration: data.duration
                                    },
                                    { new: true, runValidators: true }
                                );

                                if (!quiz) {
                                    const newQuiz = new QuizModel({
                                        ...data,
                                        section: courseDataItem.section,
                                        courseId // Add courseId to the new quiz
                                    });
                                    await newQuiz.save();

                                    course.courseData.map((data: any) => {
                                        data.tracks.map((item: any) => {
                                            if (item.position >= position) {
                                                item.position =
                                                    item.position + 1;
                                            }
                                        });

                                        if (data.section === newQuiz.section) {
                                            data.tracks.push({
                                                typeTrack: 'quiz',
                                                position,
                                                trackId: newQuiz._id
                                            });
                                        }
                                    });
                                }
                            }
                        } else {
                            // Handle invalid typeTrack case (throw error or log warning)
                            throw new Error('Invalid typeTrack in courseData');
                        }
                    }
                } else {
                    const newSection = {
                        section: courseDataItem.section,
                        tracks: []
                    } as any;

                    // Thêm track vào phần mới
                    for (const trackItem of courseDataItem.tracks) {
                        const { trackId, typeTrack, position, ...data } =
                            trackItem;

                        if (typeTrack === 'lesson') {
                            const newLesson = new LessonModel({
                                ...data,
                                section: newSection.section,
                                courseId // Thêm courseId cho bài giảng mới
                            });
                            await newLesson.save();

                            newSection.tracks.push({
                                typeTrack: 'lesson',
                                position,
                                trackId: newLesson._id
                            });
                        } else if (typeTrack === 'quiz') {
                            const newQuiz = new QuizModel({
                                ...data,
                                section: newSection.section,
                                courseId // Thêm courseId cho bài kiểm tra mới
                            });
                            await newQuiz.save();

                            newSection.tracks.push({
                                typeTrack: 'quiz',
                                position,
                                trackId: newQuiz._id
                            });
                        } else {
                            // Xử lý trường hợp typeTrack không hợp lệ
                            throw new Error('Invalid typeTrack in courseData');
                        }
                    }

                    course.courseData.push(newSection);
                }
            }

            await course?.save();

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
                const course = await CourseModel.findById(courseId);

                if (!course) {
                    // Handle the case where `course` is null or undefined
                    return next(new ErrorHandler('Course not found', 404));
                }

                const transformedCourseData = await Promise.all(
                    course.courseData.map(async (courseData) => ({
                        section: courseData.section,
                        tracks: await Promise.all(
                            courseData.tracks.map(async (track) => ({
                                trackId: track.trackId,
                                typeTrack: track.typeTrack,
                                position: track.position,
                                track_step:
                                    track.typeTrack === 'lesson'
                                        ? await LessonModel.findById(
                                              track.trackId
                                          )
                                        : await QuizModel.findById(
                                              track.trackId
                                          )
                            }))
                        )
                    }))
                );

                const data = {
                    _id: course._id,
                    name: course.name,
                    description: course.description,
                    categoryId: course.categoryId,
                    price: course.price,
                    estimatedPrice: course.estimatedPrice,
                    thumbnail: course.thumbnail,
                    tags: course.tags,
                    level: course.level,
                    demoUrl: course.demoUrl,
                    benefits: course.benefits,
                    prerequisites: course.prerequisites,
                    reviews: course.reviews,
                    ratings: course.ratings,
                    purchased: course.purchased,
                    status: course.status,
                    course_creator: course.course_creator,
                    courseData: transformedCourseData
                };

                await redis.set(courseId, JSON.stringify(data), 'EX', 604800); //7days

                res.status(200).json({
                    success: true,
                    data
                });
            }
        } catch (error: any) {
            next(new ErrorHandler(error.message, 500));
        }
    }
);

//get single course --- without purchasing
export const getAdminDetailCourse = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courseId = req.params.id;
            const course = await CourseModel.findById(courseId);

            if (!course) {
                // Handle the case where `course` is null or undefined
                return next(new ErrorHandler('Course not found', 404));
            }

            const transformedCourseData = await Promise.all(
                course.courseData.map(async (courseData) => ({
                    _id: courseData._id,
                    section: courseData.section,
                    tracks: await Promise.all(
                        courseData.tracks.map(async (track) => {
                            const trackData = {
                                trackId: track.trackId,
                                typeTrack: track.typeTrack,
                                position: track.position
                            };

                            if (track.typeTrack === 'lesson') {
                                const lesson = await LessonModel.findById(
                                    track.trackId
                                ).lean();
                                return { ...trackData, ...lesson };
                            } else if (track.typeTrack === 'quiz') {
                                const quiz = await QuizModel.findById(
                                    track.trackId
                                ).lean();
                                return { ...trackData, ...quiz };
                            }

                            return trackData;
                        })
                    )
                }))
            );

            const data = {
                _id: course._id,
                name: course.name,
                description: course.description,
                categoryId: course.categoryId,
                price: course.price,
                estimatedPrice: course.estimatedPrice,
                thumbnail: course.thumbnail,
                tags: course.tags,
                level: course.level,
                demoUrl: course.demoUrl,
                benefits: course.benefits,
                prerequisites: course.prerequisites,
                reviews: course.reviews,
                ratings: course.ratings,
                purchased: course.purchased,
                status: course.status,
                course_creator: course.course_creator,
                courseData: transformedCourseData
            };

            res.status(200).json({
                success: true,
                data
            });
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

//get courses -- only for user
export const getMyCoursesByUser = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.params.id;

            const userExist = await userModel.findOne({ _id: userId });

            if (!userExist) {
                return next(new ErrorHandler('user not found', 404));
            }

            const transformedCourseData = await Promise.all(
                userExist?.courses.map(
                    async (course) =>
                        await CourseModel.findById(course.courseId)
                )
            );

            res.status(200).json({
                success: true,
                courses: transformedCourseData
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
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
                (course: any) => course.courseId === courseId
            );

            if (!courseExists) {
                return next(
                    new ErrorHandler(
                        'Bạn không đủ điều kiện để truy cập khóa học này',
                        404
                    )
                );
            }

            const course = await CourseModel.findById(courseId);

            if (!course) {
                // Handle the case where `course` is null or undefined
                return next(new ErrorHandler('Course not found', 404));
            }

            const transformedCourseData = await Promise.all(
                course.courseData.map(async (courseData) => ({
                    section: courseData.section,
                    tracks: await Promise.all(
                        courseData.tracks.map(async (track) => ({
                            trackId: track.trackId,
                            typeTrack: track.typeTrack,
                            position: track.position,
                            userCompleted: track.userCompleted,
                            track_step:
                                track.typeTrack === 'lesson'
                                    ? await LessonModel.findById(track.trackId)
                                    : await QuizModel.findById(track.trackId)
                        }))
                    )
                }))
            );

            res.status(200).json({
                success: true,
                content: transformedCourseData
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

            const userCourseList = req.user?.courses;

            const courseExists = userCourseList?.some(
                (course: any) => course.courseId === courseId.toString()
            );

            if (!courseExists) {
                return next(
                    new ErrorHandler(
                        'Bạn không đủ điều kiện để truy cập khóa học này',
                        404
                    )
                );
            }

            const course = await CourseModel.findById(courseId);

            if (!course) {
                // Handle the case where `course` is null or undefined
                return next(new ErrorHandler('Không tìm thấy khóa học', 404));
            }

            const newComment: any = {
                user: req.user,
                comment,
                commentReplies: []
            };
            let model;
            if (typeTrack === 'lesson') {
                model = await LessonModel.findById(trackId);
            } else if (typeTrack === 'quiz') {
                model = await QuizModel.findById(trackId);
            } else {
                return next(new ErrorHandler('typeTrack không hợp lệ', 400));
            }

            // Check if model exists
            if (!model) {
                return next(
                    new ErrorHandler('Không tìm thấy bài học hoặc câu hỏi', 404)
                );
            }
            // Update comments array in the model
            model.comments.push(newComment); // Replace with actual user data

            await NotificationModel.create({
                user: req.user?._id,
                title: 'Đã nhận được hỏi đáp mới',
                message: `Bạn có một hỏi đáp tại ${model.title}`
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

            if (!trackId) {
                return next(new ErrorHandler('Invalid content id', 400));
            }

            let courseContent;
            course?.courseData?.map((item) => {
                item.tracks.map((track) => {
                    if (track.trackId.toString() === trackId) {
                        courseContent = track;
                    }
                });
            });

            if (!courseContent) {
                return next(new ErrorHandler('Invalid content', 400));
            }

            let content;
            if (typeTrack === 'lesson') {
                content = await LessonModel.findById(trackId);
            } else if (typeTrack === 'quiz') {
                content = await QuizModel.findById(trackId);
            } else {
                return next(new ErrorHandler('Invalid typeTrack', 400));
            }

            // Check if model exists
            if (!content) {
                return next(new ErrorHandler('Lesson or Quiz not found', 404));
            }

            const commentIndex = content.comments.findIndex(
                (comment: any) => comment._id.toString() === commentId
            );
            if (commentIndex === -1) {
                return next(new ErrorHandler('Comment not found', 404));
            }

            const newAnswer: any = {
                user: req.user,
                reply,
                createdAt: Date.now()
            };

            content.comments[commentIndex].commentReplies?.push(newAnswer);

            await content.save();

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
    courseId: string;
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
                (course: any) => course.courseId === courseId.toString()
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
                review: review
            };

            course?.reviews.push(reviewData);

            let avg = 0;

            course?.reviews.forEach((rev: any) => {
                avg += rev.rating;
            });

            if (course) {
                course.ratings = avg / course.reviews.length;
                //one exam have 2 reviews one is 5 another one is 4 so math working like this = 9 / 2 = 4.5 ratings
            }

            //await redis.set(courseId, JSON.stringify(course), 'EX', 604800); //7days

            await course?.save();

            await NotificationModel.create({
                user: req.user?._id,
                title: 'Đã nhận được đánh giá mới',
                message: `${req.user?.name} đánh giá trong ${course?.name}`
            });

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
                return next(new ErrorHandler('Không tìm thấy đánh giá', 404));
            }

            const replyData: any = {
                user: req.user,
                comment,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (!review.reviewReplies) {
                review.reviewReplies = [];
            }

            review.reviewReplies.push(replyData);

            await course.save();

            //await redis.set(courseId, JSON.stringify(course), 'EX', 604800);

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

export const completeCourse = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { trackId, courseId, userId } = req.body;

            const course = await CourseModel.findById(courseId);
            if (!course) {
                return next(new ErrorHandler('course not found', 404));
            }

            for (const data of course.courseData) {
                for (const item of data.tracks) {
                    if (item.trackId.toString() === trackId) {
                        const isCompleted = item?.userCompleted?.some(
                            (comp: any) => comp.userId === userId
                        );

                        if (!isCompleted) {
                            item?.userCompleted?.push({ userId });
                        } else {
                            console.log('Dã hoàn thành');
                        }
                    }
                }
            }

            await course?.save();

            res.status(200).json({
                success: true,
                message: 'completed successfully',
                course
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
