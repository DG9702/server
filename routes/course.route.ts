import { authorizeRoles, isAutheticated } from './../middleware/auth';
import express from "express";
import {addAnswer, addComment, addReplyToReview, addReview, deleteCourse, editCourse, generateVideoUrl, getAdminAllCourses, getAllCourse, getCourseByUser, getSingleCourse, uploadCourse} from "../controller/course.controller";
import {updateAccessToken} from '../controller/user.controller';
const courseRouter = express.Router();

courseRouter.post("/create-course", updateAccessToken, isAutheticated, authorizeRoles("admin"), uploadCourse);

courseRouter.put("/edit-course/:id", updateAccessToken, isAutheticated, authorizeRoles("admin"), editCourse);

courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourse);
courseRouter.get("/get-course-content/:id", updateAccessToken, isAutheticated, getCourseByUser);
//get all courses in admin
courseRouter.get("/get-admin-courses", isAutheticated, authorizeRoles("admin"), getAdminAllCourses);

courseRouter.put("/add-comment", isAutheticated, addComment);
courseRouter.put("/add-answer", isAutheticated, addAnswer);
courseRouter.put("/add-review/:id", isAutheticated, addReview);
courseRouter.put("/add-reply-review", isAutheticated, authorizeRoles("admin"), addReplyToReview);

courseRouter.delete("/delete-course/:id", isAutheticated, authorizeRoles("admin"), deleteCourse);

courseRouter.post("/getVdoCipherOTP", generateVideoUrl);

export default courseRouter;