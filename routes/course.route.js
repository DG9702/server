"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("./../middleware/auth");
const express_1 = __importDefault(require("express"));
const course_controller_1 = require("../controller/course.controller");
const courseRouter = express_1.default.Router();
courseRouter.post('/create-course', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), course_controller_1.uploadCourse);
courseRouter.put('/edit-course/:id', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), course_controller_1.editCourse);
courseRouter.get('/get-course/:id', course_controller_1.getSingleCourse);
courseRouter.get('/get-courses', course_controller_1.getAllCourses);
courseRouter.get('/get-course-content/:id', auth_1.isAutheticated, course_controller_1.getCourseByUser);
//get all courses in admin
courseRouter.get('/get-admin-courses', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), course_controller_1.getAdminAllCourses);
courseRouter.get('/get-admin-course/:id', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), course_controller_1.getAdminDetailCourse);
courseRouter.put('/add-comment', auth_1.isAutheticated, course_controller_1.addComment);
courseRouter.put('/add-reply-comment', auth_1.isAutheticated, course_controller_1.addAnswer);
courseRouter.put('/add-review/:id', auth_1.isAutheticated, course_controller_1.addReview);
courseRouter.put('/add-reply-review', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), course_controller_1.addReplyToReview);
courseRouter.delete('/delete-course/:id', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), course_controller_1.deleteCourse);
courseRouter.post('/getVdoCipherOTP', course_controller_1.generateVideoUrl);
courseRouter.get('/getMyCoursesByUser/:id', course_controller_1.getMyCoursesByUser);
courseRouter.put('/completed-lesson', course_controller_1.completeCourse);
exports.default = courseRouter;
