"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controller/user.controller");
const auth_1 = require("../middleware/auth");
const userRouter = express_1.default.Router();
userRouter.post('/registration', user_controller_1.registrationUser);
userRouter.post('/activate-user', user_controller_1.activateUser);
userRouter.post('/login', user_controller_1.loginUser);
userRouter.get('/logout', auth_1.isAutheticated, user_controller_1.logoutUser);
userRouter.get('/refresh', user_controller_1.updateAccessToken);
userRouter.get('/me', user_controller_1.updateAccessToken, auth_1.isAutheticated, user_controller_1.getUserInfo);
userRouter.post('/social-auth', user_controller_1.socialAuth);
//update user
userRouter.put('/update-user-info', auth_1.isAutheticated, user_controller_1.updateUserInfo);
userRouter.put('/update-user-password', user_controller_1.updateAccessToken, auth_1.isAutheticated, user_controller_1.updatePassword);
userRouter.put('/update-user-avatar', auth_1.isAutheticated, user_controller_1.updateProfilePicture);
userRouter.get('/get-users', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), user_controller_1.getAllUsers);
userRouter.put('/update-user-role', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), user_controller_1.updateUserRole);
userRouter.delete('/delete-user/:id', auth_1.isAutheticated, (0, auth_1.authorizeRoles)('admin'), user_controller_1.deleteUser);
userRouter.post('/forgot-password', user_controller_1.forgotPassword);
userRouter.put('/reset-password', user_controller_1.resetPassword);
exports.default = userRouter;
