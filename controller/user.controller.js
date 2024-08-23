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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUserRole = exports.getAllUsers = exports.updateProfilePicture = exports.updatePassword = exports.updateUserInfo = exports.socialAuth = exports.getUserInfo = exports.updateAccessToken = exports.logoutUser = exports.resetPassword = exports.createResetToken = exports.forgotPassword = exports.loginUser = exports.activateUser = exports.createActivationToken = exports.registrationUser = void 0;
require('dotenv').config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const user_model_1 = __importDefault(require("./../models/user.model"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const jwt_1 = require("../utils/jwt");
const redis_1 = require("../utils/redis");
const user_service_1 = require("../services/user.service");
exports.registrationUser = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        const isEmailExist = yield user_model_1.default.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler_1.default('Email đã tồn tại', 400));
        }
        const user = {
            name,
            email,
            password
        };
        const activationToken = (0, exports.createActivationToken)(user);
        const activationCode = activationToken.activationCode;
        const data = { user: { name: user.name }, activationCode };
        const html = yield ejs_1.default.renderFile(path_1.default.join(__dirname, '../mails/activation-mail.ejs'), data);
        try {
            yield (0, sendMail_1.default)({
                email: user.email,
                subject: 'Kích hoạt tài khoản',
                template: 'activation-mail.ejs',
                data
            });
            res.status(201).json({
                success: true,
                message: `Vui lòng kiểm tra email: ${user.email} để kích hoạt tài khoản của bạn!`,
                activationToken: activationToken.token
            });
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 400));
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
const createActivationToken = (user) => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jsonwebtoken_1.default.sign({
        user,
        activationCode
    }, process.env.ACTIVATION_SECRET, {
        expiresIn: '60m'
    });
    return { token, activationCode };
};
exports.createActivationToken = createActivationToken;
exports.activateUser = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { activation_token, activation_code } = req.body;
        const newUser = jsonwebtoken_1.default.verify(activation_token, process.env.ACTIVATION_SECRET);
        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler_1.default('Mã kích hoạt không hợp lệ', 400));
        }
        const { name, email, password } = newUser.user;
        const existUser = yield user_model_1.default.findOne({ email });
        if (existUser) {
            return next(new ErrorHandler_1.default('Email đã tồn tại', 400));
        }
        const user = yield user_model_1.default.create({
            name,
            email,
            password
        });
        res.status(201).json({
            success: true,
            message: 'Kích hoạt tài khoản thành công',
            user
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
exports.loginUser = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ErrorHandler_1.default('Vui lòng nhập tài khoản và mật khẩu', 400));
        }
        const user = yield user_model_1.default.findOne({ email }).select('+password');
        if (!user) {
            return next(new ErrorHandler_1.default('Không tìm thấy tài khoản người dùng', 400));
        }
        const isPasswordMatch = yield user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default('Mật khẩu không hợp lệ', 400));
        }
        (0, jwt_1.sendToken)(user, 200, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
exports.forgotPassword = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const isEmailExist = yield user_model_1.default.findOne({ email });
        if (!isEmailExist) {
            return next(new ErrorHandler_1.default('Không tìm thấy người dùng', 400));
        }
        const user = {
            email
        };
        const resetToken = (0, exports.createResetToken)(user);
        const resetCode = resetToken.resetCode;
        const data = { user: { email: user.email }, resetCode };
        const html = yield ejs_1.default.renderFile(path_1.default.join(__dirname, '../mails/resetPassword-mail.ejs'), data);
        try {
            yield (0, sendMail_1.default)({
                email: user.email,
                subject: 'Yêu cầu đặt lại mật khẩu',
                template: 'resetPassword-mail.ejs',
                data
            });
            res.status(201).json({
                success: true,
                message: `Vui lòng kiểm tra email của bạn: ${user.email} để đặt lại mật khẩu tài khoản của bạn!`,
                resetToken: resetToken
            });
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 400));
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
const createResetToken = (user) => {
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jsonwebtoken_1.default.sign({
        user,
        resetCode
    }, process.env.ACTIVATION_SECRET, {
        expiresIn: '60m'
    });
    return { token, resetCode };
};
exports.createResetToken = createResetToken;
exports.resetPassword = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { resetCode, resetToken, newPassword } = req.body;
        const newUser = jsonwebtoken_1.default.verify(resetToken, process.env.ACTIVATION_SECRET);
        if (newUser.resetCode !== resetCode) {
            return next(new ErrorHandler_1.default('Mã đặt lại không hợp lệ', 400));
        }
        const { email } = newUser.user;
        const user = yield user_model_1.default.findOne({ email }).select('+password');
        if (!user) {
            return next(new ErrorHandler_1.default('Tài khoản không hợp lệ', 400));
        }
        user.password = newPassword;
        user.save();
        res.status(201).json({
            success: true,
            message: 'Đặt lại mật khẩu thành công',
            user
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
//logout user
exports.logoutUser = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        res.cookie('access_token', '', { maxAge: 1 });
        res.cookie('refresh_token', '', { maxAge: 1 });
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || '';
        redis_1.redis.del(userId);
        res.status(200).json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
//update access token
exports.updateAccessToken = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const refresh_token = req.cookies.refresh_token;
        const decoded = jsonwebtoken_1.default.verify(refresh_token, process.env.REFRESH_TOKEN);
        const message = 'Không thể làm mới mã thông báo';
        if (!decoded) {
            return next(new ErrorHandler_1.default(message, 400));
        }
        const session = yield redis_1.redis.get(decoded.id);
        if (!session) {
            return next(new ErrorHandler_1.default('Hãy đăng nhập để thực hiện chức năng này', 400));
        }
        const user = JSON.parse(session);
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.ACCESS_TOKEN, {
            expiresIn: '60m'
        });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN, {
            expiresIn: '3d'
        });
        req.user = user;
        res.cookie('access_token', accessToken, jwt_1.accessTokenOptions);
        res.cookie('refresh_token', refreshToken, jwt_1.refreshTokenOptions);
        yield redis_1.redis.set(user._id, JSON.stringify(user), 'EX', 604800); // 7days
        next();
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
//get user info
exports.getUserInfo = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        (0, user_service_1.getUserById)(userId, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
//social auth
exports.socialAuth = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, avatar } = req.body;
        const user = yield user_model_1.default.findOne({ email });
        if (!user) {
            const newUser = yield user_model_1.default.create({ email, name, avatar });
            (0, jwt_1.sendToken)(newUser, 200, res);
        }
        else {
            (0, jwt_1.sendToken)(user, 200, res);
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
exports.updateUserInfo = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const { name } = req.body;
        const userId = (_c = req.user) === null || _c === void 0 ? void 0 : _c._id;
        const user = yield user_model_1.default.findById(userId);
        if (name && user) {
            user.name = name;
        }
        yield (user === null || user === void 0 ? void 0 : user.save());
        yield redis_1.redis.set(userId, JSON.stringify(user));
        res.status(201).json({
            success: true,
            user
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
exports.updatePassword = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e;
    try {
        const { oldPassword, newPassword } = req.body;
        const user = yield user_model_1.default
            .findById((_d = req.user) === null || _d === void 0 ? void 0 : _d._id)
            .select('+password');
        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler_1.default('Vui lòng nhập mật khẩu cũ và mật khẩu mới', 400));
        }
        if ((user === null || user === void 0 ? void 0 : user.password) === undefined) {
            return next(new ErrorHandler_1.default('Mật khẩu không hợp lệ', 400));
        }
        const isPasswordMatch = yield (user === null || user === void 0 ? void 0 : user.comparePassword(oldPassword));
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default('Mật khẩu hiện tại không đúng', 400));
        }
        user.password = newPassword;
        yield user.save();
        yield redis_1.redis.set((_e = req.user) === null || _e === void 0 ? void 0 : _e._id, JSON.stringify(user));
        res.status(201).json({
            success: true,
            user
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
exports.updateProfilePicture = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g, _h, _j;
    try {
        const { avatar } = req.body;
        const userId = (_f = req === null || req === void 0 ? void 0 : req.user) === null || _f === void 0 ? void 0 : _f._id;
        const user = yield user_model_1.default.findById(userId);
        const decoded = jsonwebtoken_1.default.verify((_g = req === null || req === void 0 ? void 0 : req.cookies) === null || _g === void 0 ? void 0 : _g.access_token, process.env.ACCESS_TOKEN);
        if (avatar && user) {
            //if user have one avatar then call this if
            if ((_h = user === null || user === void 0 ? void 0 : user.avatar) === null || _h === void 0 ? void 0 : _h.public_id) {
                //first delete the old image
                yield cloudinary_1.default.v2.uploader.destroy((_j = user === null || user === void 0 ? void 0 : user.avatar) === null || _j === void 0 ? void 0 : _j.public_id);
                const myCloud = yield cloudinary_1.default.v2.uploader.upload(avatar, {
                    folder: 'avatars',
                    width: 150
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                };
            }
            else {
                const myCloud = yield cloudinary_1.default.v2.uploader.upload(avatar, {
                    folder: 'avatars',
                    width: 150
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                };
            }
        }
        yield (user === null || user === void 0 ? void 0 : user.save());
        yield redis_1.redis.set(userId, JSON.stringify(user));
        res.status(201).json({
            success: true,
            message: 'Cập nhật ảnh đại diện thành công',
            user
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
// get all users --- only for admin
exports.getAllUsers = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, user_service_1.getAllUsersService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
// update user role --- only for admin
exports.updateUserRole = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, role } = req.body;
        const isUserExist = yield user_model_1.default.findOne({ email });
        if (isUserExist) {
            const id = isUserExist._id;
            (0, user_service_1.updateUserRoleService)(res, id, role);
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Không tìm thấy tài khoản'
            });
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
// Delete user --- only for admin
exports.deleteUser = (0, catchAsyncErrors_1.catchAsyncErrors)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield user_model_1.default.findById(id);
        if (!user) {
            return next(new ErrorHandler_1.default('Không tìm thấy tài khoản', 404));
        }
        yield user.deleteOne({ id });
        yield redis_1.redis.del(id);
        res.status(200).json({
            success: true,
            message: 'Xóa tài khoản thành công'
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
}));
//validate user role
//export const authorizeRoles = (...roles: string[]) => {
//    return (req: Request, res: Response, next: NextFunction) => {
//        if (!roles.includes(req.user?.role || '')) {
//            return next(new ErrorHandler(`Role: ${req.user?.role} is not allowed to acess this resource`, 403));
//        }
//        next();
//    }
//}
