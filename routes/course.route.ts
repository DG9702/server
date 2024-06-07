import { authorizeRoles, isAutheticated } from './../middleware/auth';
import express from "express";
import {addAnswer, addComment, addReplyToReview, addReview, editCourse, getAllCourse, getCourseByUser, getSingleCourse, uploadCourse} from "../controller/course.controller";
const courseRouter = express.Router();

courseRouter.post("/create-course", isAutheticated, authorizeRoles("admin"), uploadCourse);

courseRouter.put("/edit-course/:id", isAutheticated, authorizeRoles("admin"), editCourse);

courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourse);
courseRouter.get("/get-course-content/:id", isAutheticated, getCourseByUser);

courseRouter.put("/add-comment", isAutheticated, addComment);
courseRouter.put("/add-answer", isAutheticated, addAnswer);
courseRouter.put("/add-review/:id", isAutheticated, addReview);
courseRouter.put("/add-reply-review", isAutheticated, authorizeRoles("admin"), addReplyToReview);


export default courseRouter;