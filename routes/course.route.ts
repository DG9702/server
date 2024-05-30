import { authorizeRoles, isAutheticated } from './../middleware/auth';
import express from "express";
import {editCourse, getAllCourse, getSingleCourse, uploadCourse} from "../controller/course.controller";
const courseRouter = express.Router();

courseRouter.post("/create-course", isAutheticated, authorizeRoles("admin"), uploadCourse);

courseRouter.put("/edit-course/:id", isAutheticated, authorizeRoles("admin"), editCourse);

courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourse);


export default courseRouter;