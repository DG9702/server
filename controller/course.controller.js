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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideoUrl = exports.completeCourse = exports.deleteCourse = exports.getAdminAllCourses = exports.addReplyToReview = exports.addReview = exports.addAnswer = exports.addComment = exports.getCourseByUser = exports.getMyCoursesByUser = exports.getAllCourses = exports.getAdminDetailCourse = exports.getSingleCourse = exports.editCourse = exports.uploadCourse = void 0;
const cloudinary_1 = __importDefault(require("cloudinary"));
const axios_1 = __importDefault(require("axios"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const course_service_1 = require("../services/course.service");
const course_model_1 = __importDefault(require("../models/course.model"));
const redis_1 = require("../utils/redis");
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const notification_model_1 = __importDefault(require("../models/notification.model"));
const lesson_model_1 = __importDefault(require("../models/lesson.model"));
const quiz_model_1 = __importDefault(require("../models/quiz.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
//upload course
exports.uploadCourse = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCloud = yield cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: 'courses'
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            };
        }
        const newCourse = new course_model_1.default({
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
            courseData: data.courseData.map((section) => ({
                section: section.section,
                tracks: section.tracks.map((track) => ({
                    typeTrack: track.typeTrack,
                    position: track.position,
                    trackId: null,
                    userCompleted: []
                }))
            })),
            course_creator: data.course_creator
        });
        const createdCourseDataPromises = [];
        // Create lectures and quizzes asynchronously using Promise.all
        for (const courseDataItem of data.courseData) {
            for (let i = 0; i < courseDataItem.tracks.length; i++) {
                const track = courseDataItem.tracks[i];
                if (track.typeTrack === 'lesson') {
                    createdCourseDataPromises.push(lesson_model_1.default.create(Object.assign({ section: courseDataItem.section, courseId: newCourse._id }, track)).then((createdLesson) => {
                        // Update trackId with createdLesson._id
                        track.trackId = createdLesson._id;
                        track.section = courseDataItem === null || courseDataItem === void 0 ? void 0 : courseDataItem.section;
                        return createdLesson;
                    }));
                }
                else if (track.typeTrack === 'quiz') {
                    yield createdCourseDataPromises.push(quiz_model_1.default.create(Object.assign({ courseId: newCourse._id, section: courseDataItem.section }, track)).then((createdQuiz) => {
                        // Update trackId with createdQuiz._id
                        track.trackId = createdQuiz._id;
                        track.section = courseDataItem === null || courseDataItem === void 0 ? void 0 : courseDataItem.section;
                        return createdQuiz;
                    }));
                }
                else {
                    throw new Error('Invalid typeTrack in courseData');
                }
            }
        }
        const createdCourseData = yield Promise.all(createdCourseDataPromises);
        newCourse.courseData.map((courseData, index) => {
            courseData.tracks.map((track, trackIndex) => {
                createdCourseData.forEach((createData, createIndex) => {
                    const createPosition = createIndex + 1;
                    if (createData.section === courseData.section &&
                        createData.typeTrack === track.typeTrack &&
                        createPosition === track.position) {
                        track.trackId = createData._id;
                    }
                });
            });
        });
        yield newCourse.save();
        res.status(201).json({
            message: 'Course created successfully',
            course: newCourse
        });
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 500));
    }
}));
//edit course --- Chưa xử lý được xóa hẳn một section
exports.editCourse = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const courseId = req.params.id;
        const data = req.body;
        const thumbnail = data.thumbnail;
        const course = (yield course_model_1.default.findById(courseId));
        if (!course) {
            return next(new ErrorHandler_1.default('Course Not found', 404));
        }
        if (thumbnail && !(thumbnail === null || thumbnail === void 0 ? void 0 : thumbnail.startsWith('https'))) {
            yield cloudinary_1.default.v2.uploader.destroy((_a = course === null || course === void 0 ? void 0 : course.thumbnail) === null || _a === void 0 ? void 0 : _a.public_id);
            const myCloud = yield cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: 'courses'
            });
            data.thumbnail = {
                public_id: myCloud === null || myCloud === void 0 ? void 0 : myCloud.public_id,
                url: myCloud === null || myCloud === void 0 ? void 0 : myCloud.secure_url
            };
        }
        if (thumbnail === null || thumbnail === void 0 ? void 0 : thumbnail.startsWith('https')) {
            data.thumbnail = {
                public_id: (_b = course === null || course === void 0 ? void 0 : course.thumbnail) === null || _b === void 0 ? void 0 : _b.public_id,
                url: (_c = course === null || course === void 0 ? void 0 : course.thumbnail) === null || _c === void 0 ? void 0 : _c.url
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
            const foundContent = course.courseData.find((content) => content._id.toString() === courseDataItem._id);
            if (foundContent) {
                foundContent.section = courseDataItem.section;
                for (const trackItem of courseDataItem.tracks) {
                    const { trackId, typeTrack, position } = trackItem, data = __rest(trackItem, ["trackId", "typeTrack", "position"]); // Destructure typeTrack and other data
                    if (typeTrack === 'lesson') {
                        if (trackItem.trackId &&
                            trackItem.title === '' &&
                            trackItem.description === '' &&
                            trackItem.videoUrl === '' &&
                            trackItem.duration === 0) {
                            yield lesson_model_1.default.findByIdAndDelete({
                                _id: trackId
                            });
                            let deletedTrackIndex = course.courseData.findIndex((section) => section.tracks.some((track) => track.trackId ===
                                trackItem.trackId));
                            if (deletedTrackIndex !== -1) {
                                const deletedSection = course.courseData[deletedTrackIndex];
                                const deletedTrackIndexInSection = deletedSection.tracks.findIndex((track) => track.trackId === trackId);
                                course.courseData.forEach((section, i) => {
                                    section.tracks.forEach((track, j) => {
                                        if (track.position >
                                            trackItem.position) {
                                            track.position =
                                                track.position - 1;
                                        }
                                    });
                                });
                            }
                            course.courseData = course.courseData.map((sectionData) => {
                                return Object.assign(Object.assign({}, sectionData), { tracks: sectionData.tracks.filter((track) => track.trackId !==
                                        trackItem.trackId) });
                            });
                        }
                        else {
                            const lesson = yield lesson_model_1.default.findByIdAndUpdate(trackItem.trackId, // Update if _id exists
                            {
                                title: data.title,
                                description: data.description,
                                section: courseDataItem.section,
                                videoUrl: data.videoUrl,
                                duration: data.duration,
                                links: data.links,
                                suggestion: data.suggestion
                            }, { new: true, runValidators: true } // Return updated document and validate data
                            );
                            if (!lesson) {
                                const newLesson = new lesson_model_1.default(Object.assign(Object.assign({}, data), { section: courseDataItem.section, courseId // Add courseId to the new lecture
                                 }));
                                yield newLesson.save();
                                course.courseData.map((data) => {
                                    data.tracks.map((item) => {
                                        if (item.position >= position) {
                                            item.position =
                                                item.position + 1;
                                        }
                                    });
                                    if (data.section === newLesson.section) {
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
                    }
                    else if (typeTrack === 'quiz') {
                        // Update existing quiz or create new one (similar logic as lectures)
                        if (trackItem.trackId &&
                            trackItem.title === '' &&
                            trackItem.description === '' &&
                            trackItem.content === '' &&
                            trackItem.duration === 0) {
                            yield quiz_model_1.default.findByIdAndDelete({
                                _id: trackId
                            });
                            let deletedTrackIndex = course.courseData.findIndex((section) => section.tracks.some((track) => track.trackId ===
                                trackItem.trackId));
                            if (deletedTrackIndex !== -1) {
                                const deletedSection = course.courseData[deletedTrackIndex];
                                const deletedTrackIndexInSection = deletedSection.tracks.findIndex((track) => track.trackId === trackId);
                                course.courseData.forEach((section, i) => {
                                    section.tracks.forEach((track, j) => {
                                        if (track.position >
                                            trackItem.position) {
                                            track.position =
                                                track.position - 1;
                                        }
                                    });
                                });
                            }
                            course.courseData = course.courseData.map((sectionData) => {
                                return Object.assign(Object.assign({}, sectionData), { tracks: sectionData.tracks.filter((track) => track.trackId !==
                                        trackItem.trackId) });
                            });
                        }
                        else {
                            const quiz = yield quiz_model_1.default.findByIdAndUpdate(trackItem.trackId, {
                                title: data.title,
                                description: data.description,
                                section: courseDataItem.section,
                                content: data.content,
                                questions: data.questions,
                                duration: data.duration
                            }, { new: true, runValidators: true });
                            if (!quiz) {
                                const newQuiz = new quiz_model_1.default(Object.assign(Object.assign({}, data), { section: courseDataItem.section, courseId // Add courseId to the new quiz
                                 }));
                                yield newQuiz.save();
                                course.courseData.map((data) => {
                                    data.tracks.map((item) => {
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
                    }
                    else {
                        // Handle invalid typeTrack case (throw error or log warning)
                        throw new Error('Invalid typeTrack in courseData');
                    }
                }
            }
            else {
                const newSection = {
                    section: courseDataItem.section,
                    tracks: []
                };
                // Thêm track vào phần mới
                for (const trackItem of courseDataItem.tracks) {
                    const { trackId, typeTrack, position } = trackItem, data = __rest(trackItem, ["trackId", "typeTrack", "position"]);
                    if (typeTrack === 'lesson') {
                        const newLesson = new lesson_model_1.default(Object.assign(Object.assign({}, data), { section: newSection.section, courseId // Thêm courseId cho bài giảng mới
                         }));
                        yield newLesson.save();
                        newSection.tracks.push({
                            typeTrack: 'lesson',
                            position,
                            trackId: newLesson._id
                        });
                    }
                    else if (typeTrack === 'quiz') {
                        const newQuiz = new quiz_model_1.default(Object.assign(Object.assign({}, data), { section: newSection.section, courseId // Thêm courseId cho bài kiểm tra mới
                         }));
                        yield newQuiz.save();
                        newSection.tracks.push({
                            typeTrack: 'quiz',
                            position,
                            trackId: newQuiz._id
                        });
                    }
                    else {
                        // Xử lý trường hợp typeTrack không hợp lệ
                        throw new Error('Invalid typeTrack in courseData');
                    }
                }
                course.courseData.push(newSection);
            }
        }
        yield (course === null || course === void 0 ? void 0 : course.save());
        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            course
        });
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 500));
    }
}));
//get single course --- without purchasing
exports.getSingleCourse = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courseId = req.params.id;
        const isCacheExist = yield redis_1.redis.get(courseId);
        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course
            });
        }
        else {
            const course = yield course_model_1.default.findById(courseId);
            if (!course) {
                // Handle the case where `course` is null or undefined
                return next(new ErrorHandler_1.default('Course not found', 404));
            }
            const transformedCourseData = yield Promise.all(course.courseData.map((courseData) => __awaiter(void 0, void 0, void 0, function* () {
                return ({
                    section: courseData.section,
                    tracks: yield Promise.all(courseData.tracks.map((track) => __awaiter(void 0, void 0, void 0, function* () {
                        return ({
                            trackId: track.trackId,
                            typeTrack: track.typeTrack,
                            position: track.position,
                            track_step: track.typeTrack === 'lesson'
                                ? yield lesson_model_1.default.findById(track.trackId)
                                : yield quiz_model_1.default.findById(track.trackId)
                        });
                    })))
                });
            })));
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
            yield redis_1.redis.set(courseId, JSON.stringify(data), 'EX', 604800); //7days
            res.status(200).json({
                success: true,
                data
            });
        }
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 500));
    }
}));
//get single course --- without purchasing
exports.getAdminDetailCourse = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courseId = req.params.id;
        const course = yield course_model_1.default.findById(courseId);
        if (!course) {
            // Handle the case where `course` is null or undefined
            return next(new ErrorHandler_1.default('Course not found', 404));
        }
        const transformedCourseData = yield Promise.all(course.courseData.map((courseData) => __awaiter(void 0, void 0, void 0, function* () {
            return ({
                _id: courseData._id,
                section: courseData.section,
                tracks: yield Promise.all(courseData.tracks.map((track) => __awaiter(void 0, void 0, void 0, function* () {
                    const trackData = {
                        trackId: track.trackId,
                        typeTrack: track.typeTrack,
                        position: track.position
                    };
                    if (track.typeTrack === 'lesson') {
                        const lesson = yield lesson_model_1.default.findById(track.trackId).lean();
                        return Object.assign(Object.assign({}, trackData), lesson);
                    }
                    else if (track.typeTrack === 'quiz') {
                        const quiz = yield quiz_model_1.default.findById(track.trackId).lean();
                        return Object.assign(Object.assign({}, trackData), quiz);
                    }
                    return trackData;
                })))
            });
        })));
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
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 500));
    }
}));
//get all course --- without purchasing
exports.getAllCourses = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, course_service_1.getAllCoursesService)(res);
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 500));
    }
}));
//get courses -- only for user
exports.getMyCoursesByUser = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const userExist = yield user_model_1.default.findOne({ _id: userId });
        if (!userExist) {
            return next(new ErrorHandler_1.default('user not found', 404));
        }
        const transformedCourseData = yield Promise.all(userExist === null || userExist === void 0 ? void 0 : userExist.courses.map((course) => __awaiter(void 0, void 0, void 0, function* () { return yield course_model_1.default.findById(course.courseId); })));
        res.status(200).json({
            success: true,
            courses: transformedCourseData
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
}));
//get course content -- only for valid user
exports.getCourseByUser = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    try {
        const userCourseList = (_d = req.user) === null || _d === void 0 ? void 0 : _d.courses;
        const courseId = req.params.id;
        const courseExists = userCourseList === null || userCourseList === void 0 ? void 0 : userCourseList.find((course) => course.courseId === courseId);
        if (!courseExists) {
            return next(new ErrorHandler_1.default('Bạn không đủ điều kiện để truy cập khóa học này', 404));
        }
        const course = yield course_model_1.default.findById(courseId);
        if (!course) {
            // Handle the case where `course` is null or undefined
            return next(new ErrorHandler_1.default('Course not found', 404));
        }
        const transformedCourseData = yield Promise.all(course.courseData.map((courseData) => __awaiter(void 0, void 0, void 0, function* () {
            return ({
                section: courseData.section,
                tracks: yield Promise.all(courseData.tracks.map((track) => __awaiter(void 0, void 0, void 0, function* () {
                    return ({
                        trackId: track.trackId,
                        typeTrack: track.typeTrack,
                        position: track.position,
                        userCompleted: track.userCompleted,
                        track_step: track.typeTrack === 'lesson'
                            ? yield lesson_model_1.default.findById(track.trackId)
                            : yield quiz_model_1.default.findById(track.trackId)
                    });
                })))
            });
        })));
        res.status(200).json({
            success: true,
            content: transformedCourseData
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
}));
exports.addComment = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f;
    try {
        const { comment, courseId, trackId, typeTrack } = req.body;
        if (!courseId || !trackId) {
            return next(new ErrorHandler_1.default('Missing required fields', 400));
        }
        const userCourseList = (_e = req.user) === null || _e === void 0 ? void 0 : _e.courses;
        const courseExists = userCourseList === null || userCourseList === void 0 ? void 0 : userCourseList.some((course) => course.courseId === courseId.toString());
        if (!courseExists) {
            return next(new ErrorHandler_1.default('Bạn không đủ điều kiện để truy cập khóa học này', 404));
        }
        const course = yield course_model_1.default.findById(courseId);
        if (!course) {
            // Handle the case where `course` is null or undefined
            return next(new ErrorHandler_1.default('Không tìm thấy khóa học', 404));
        }
        const newComment = {
            user: req.user,
            comment,
            commentReplies: []
        };
        let model;
        if (typeTrack === 'lesson') {
            model = yield lesson_model_1.default.findById(trackId);
        }
        else if (typeTrack === 'quiz') {
            model = yield quiz_model_1.default.findById(trackId);
        }
        else {
            return next(new ErrorHandler_1.default('typeTrack không hợp lệ', 400));
        }
        // Check if model exists
        if (!model) {
            return next(new ErrorHandler_1.default('Không tìm thấy bài học hoặc câu hỏi', 404));
        }
        // Update comments array in the model
        model.comments.push(newComment); // Replace with actual user data
        yield notification_model_1.default.create({
            user: (_f = req.user) === null || _f === void 0 ? void 0 : _f._id,
            title: 'Đã nhận được hỏi đáp mới',
            message: `Bạn có một hỏi đáp tại ${model.title}`
        });
        yield model.save();
        // Update comments array in the model
        res.status(200).json({
            success: true,
            message: 'Comment created successfully',
            course,
            model
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
}));
exports.addAnswer = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j, _k;
    try {
        const { reply, courseId, trackId, commentId, typeTrack } = req.body;
        const course = yield course_model_1.default.findById(courseId);
        if (!trackId) {
            return next(new ErrorHandler_1.default('Invalid content id', 400));
        }
        let courseContent;
        (_g = course === null || course === void 0 ? void 0 : course.courseData) === null || _g === void 0 ? void 0 : _g.map((item) => {
            item.tracks.map((track) => {
                if (track.trackId.toString() === trackId) {
                    courseContent = track;
                }
            });
        });
        if (!courseContent) {
            return next(new ErrorHandler_1.default('Invalid content', 400));
        }
        let content;
        if (typeTrack === 'lesson') {
            content = yield lesson_model_1.default.findById(trackId);
        }
        else if (typeTrack === 'quiz') {
            content = yield quiz_model_1.default.findById(trackId);
        }
        else {
            return next(new ErrorHandler_1.default('Invalid typeTrack', 400));
        }
        // Check if model exists
        if (!content) {
            return next(new ErrorHandler_1.default('Lesson or Quiz not found', 404));
        }
        const commentIndex = content.comments.findIndex((comment) => comment._id.toString() === commentId);
        if (commentIndex === -1) {
            return next(new ErrorHandler_1.default('Comment not found', 404));
        }
        const newAnswer = {
            user: req.user,
            reply,
            createdAt: Date.now()
        };
        (_h = content.comments[commentIndex].commentReplies) === null || _h === void 0 ? void 0 : _h.push(newAnswer);
        yield content.save();
        if (((_j = req.user) === null || _j === void 0 ? void 0 : _j._id) === content.comments[commentIndex].user._id) {
            yield notification_model_1.default.create({
                user: (_k = req.user) === null || _k === void 0 ? void 0 : _k._id,
                title: 'New comment reply received',
                message: `You have a new comment reply in ${content.title}`
            });
        }
        else {
            const data = {
                name: content.comments[commentIndex].user.name,
                title: content.title
            };
            const html = yield ejs_1.default.renderFile(path_1.default.join(__dirname, '../mails/comment-mail.ejs'), data);
            try {
                yield (0, sendMail_1.default)({
                    email: content.comments[commentIndex].user.email,
                    subject: 'comment reply',
                    template: 'comment-mail.ejs',
                    data
                });
            }
            catch (error) {
                next(new ErrorHandler_1.default(error.message, 500));
            }
        }
        res.status(200).json({
            success: true,
            content
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
}));
exports.addReview = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _l, _m, _o;
    try {
        const userCourseList = (_l = req.user) === null || _l === void 0 ? void 0 : _l.courses;
        const { review, rating } = req.body;
        const courseId = req.params.id;
        const courseExists = userCourseList === null || userCourseList === void 0 ? void 0 : userCourseList.some((course) => course.courseId === courseId.toString());
        if (!courseExists) {
            return next(new ErrorHandler_1.default('You are not eligible to access this course', 404));
        }
        const course = yield course_model_1.default.findById(courseId);
        const reviewData = {
            user: req.user,
            rating,
            review: review
        };
        course === null || course === void 0 ? void 0 : course.reviews.push(reviewData);
        let avg = 0;
        course === null || course === void 0 ? void 0 : course.reviews.forEach((rev) => {
            avg += rev.rating;
        });
        if (course) {
            course.ratings = avg / course.reviews.length;
            //one exam have 2 reviews one is 5 another one is 4 so math working like this = 9 / 2 = 4.5 ratings
        }
        //await redis.set(courseId, JSON.stringify(course), 'EX', 604800); //7days
        yield (course === null || course === void 0 ? void 0 : course.save());
        yield notification_model_1.default.create({
            user: (_m = req.user) === null || _m === void 0 ? void 0 : _m._id,
            title: 'Đã nhận được đánh giá mới',
            message: `${(_o = req.user) === null || _o === void 0 ? void 0 : _o.name} đánh giá trong ${course === null || course === void 0 ? void 0 : course.name}`
        });
        res.status(200).json({
            success: true,
            course
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
}));
exports.addReplyToReview = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { comment, courseId, reviewId } = req.body;
        const course = yield course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default('Course not found', 404));
        }
        const review = course === null || course === void 0 ? void 0 : course.reviews.find((rev) => rev._id.toString() === reviewId);
        if (!review) {
            return next(new ErrorHandler_1.default('Không tìm thấy đánh giá', 404));
        }
        const replyData = {
            user: req.user,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (!review.reviewReplies) {
            review.reviewReplies = [];
        }
        review.reviewReplies.push(replyData);
        yield course.save();
        //await redis.set(courseId, JSON.stringify(course), 'EX', 604800);
        res.status(200).json({
            success: true,
            course
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
}));
// get all course --- only for admin
exports.getAdminAllCourses = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, course_service_1.getAllCoursesService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
// Delete Course --- only for admin
exports.deleteCourse = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const course = yield course_model_1.default.findById(id);
        if (!course) {
            return next(new ErrorHandler_1.default('course not found', 404));
        }
        // Delete associated lectures
        yield lesson_model_1.default.deleteMany({ courseId: id });
        // Delete associated quizzes
        yield quiz_model_1.default.deleteMany({ courseId: id });
        yield course.deleteOne({ id });
        yield redis_1.redis.del(id);
        res.status(200).json({
            success: true,
            message: 'course deleted successfully'
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
exports.completeCourse = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _p, _q;
    try {
        const { trackId, courseId, userId } = req.body;
        const course = yield course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default('course not found', 404));
        }
        for (const data of course.courseData) {
            for (const item of data.tracks) {
                if (item.trackId.toString() === trackId) {
                    const isCompleted = (_p = item === null || item === void 0 ? void 0 : item.userCompleted) === null || _p === void 0 ? void 0 : _p.some((comp) => comp.userId === userId);
                    if (!isCompleted) {
                        (_q = item === null || item === void 0 ? void 0 : item.userCompleted) === null || _q === void 0 ? void 0 : _q.push({ userId });
                    }
                    else {
                        console.log('Dã hoàn thành');
                    }
                }
            }
        }
        yield (course === null || course === void 0 ? void 0 : course.save());
        res.status(200).json({
            success: true,
            message: 'completed successfully',
            course
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
// generate Video URL
exports.generateVideoUrl = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoId } = req.body;
        const response = yield axios_1.default.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, { ttl: 300 }, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`
            }
        });
        res.json(response.data);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
