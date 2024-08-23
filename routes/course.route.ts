import { authorizeRoles, isAutheticated } from './../middleware/auth';
import express from 'express';
import {
    addAnswer,
    addComment,
    addReplyToReview,
    addReview,
    completeCourse,
    deleteCourse,
    editCourse,
    generateVideoUrl,
    getAdminAllCourses,
    getAdminDetailCourse,
    getAllCourses,
    getCourseByUser,
    getMyCoursesByUser,
    getSingleCourse,
    uploadCourse
} from '../controller/course.controller';
import { updateAccessToken } from '../controller/user.controller';
const courseRouter = express.Router();

courseRouter.post(
    '/create-course',
    isAutheticated,
    authorizeRoles('admin'),
    uploadCourse
);

courseRouter.put(
    '/edit-course/:id',
    isAutheticated,
    authorizeRoles('admin'),
    editCourse
);

courseRouter.get('/get-course/:id', getSingleCourse);
courseRouter.get('/get-courses', getAllCourses);
courseRouter.get('/get-course-content/:id', isAutheticated, getCourseByUser);
//get all courses in admin
courseRouter.get(
    '/get-admin-courses',
    isAutheticated,
    authorizeRoles('admin'),
    getAdminAllCourses
);

courseRouter.get(
    '/get-admin-course/:id',
    isAutheticated,
    authorizeRoles('admin'),
    getAdminDetailCourse
);

courseRouter.put('/add-comment', isAutheticated, addComment);
courseRouter.put('/add-reply-comment', isAutheticated, addAnswer);

courseRouter.put('/add-review/:id', isAutheticated, addReview);
courseRouter.put(
    '/add-reply-review',
    isAutheticated,
    authorizeRoles('admin'),
    addReplyToReview
);

courseRouter.delete(
    '/delete-course/:id',
    isAutheticated,
    authorizeRoles('admin'),
    deleteCourse
);

courseRouter.post('/getVdoCipherOTP', generateVideoUrl);

courseRouter.get('/getMyCoursesByUser/:id', getMyCoursesByUser);

courseRouter.put('/completed-lesson', completeCourse);

export default courseRouter;
