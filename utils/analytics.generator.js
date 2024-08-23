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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseByIDEnrollmentData = exports.generateCurrentYearCourseEnrollments = exports.generateLast12MonthsRevenueData = exports.generateLast12MothsData = void 0;
function generateLast12MothsData(model) {
    return __awaiter(this, void 0, void 0, function* () {
        const last12Months = [];
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        for (let i = 11; i >= 0; i--) {
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i * 28);
            const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 28);
            const monthYear = endDate.toLocaleString('default', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const count = yield model.countDocuments({
                createdAt: {
                    $gte: startDate,
                    $lt: endDate
                }
            });
            last12Months.push({ month: monthYear, count });
        }
        return { last12Months };
    });
}
exports.generateLast12MothsData = generateLast12MothsData;
function generateLast12MonthsRevenueData(model) {
    return __awaiter(this, void 0, void 0, function* () {
        const last12Months = [];
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        for (let i = 11; i >= 0; i--) {
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i * 28);
            const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 28);
            const monthYear = endDate.toLocaleString('default', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const revenueData = yield model.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startDate,
                            $lt: endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: { $multiply: ['$purchased', '$price'] }
                        }
                    }
                }
            ]);
            last12Months.push({
                month: monthYear,
                count: revenueData.length ? revenueData[0].totalRevenue : 0
            });
        }
        return { last12Months };
    });
}
exports.generateLast12MonthsRevenueData = generateLast12MonthsRevenueData;
function generateCurrentYearCourseEnrollments(model) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear + 1, 0, 1);
        const enrollmentsData = yield model.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    }
                }
            },
            {
                $group: {
                    _id: '$courseId',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    courseId: '$_id',
                    count: 1,
                    _id: 0
                }
            }
        ]);
        return enrollmentsData;
    });
}
exports.generateCurrentYearCourseEnrollments = generateCurrentYearCourseEnrollments;
function getCourseByIDEnrollmentData(model, courseId) {
    return __awaiter(this, void 0, void 0, function* () {
        const last12Months = [];
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        for (let i = 11; i >= 0; i--) {
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i * 28);
            const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 28);
            const monthYear = endDate.toLocaleString('vi', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const enrollmentData = yield model.aggregate([
                {
                    $match: {
                        courseId,
                        createdAt: {
                            $gte: startDate,
                            $lt: endDate
                        }
                    }
                },
                {
                    $count: 'totalEnrollments' // Đếm số lượng đăng ký trong mỗi tháng
                }
            ]);
            last12Months.push({
                month: monthYear,
                count: enrollmentData.length
                    ? enrollmentData[0].totalEnrollments
                    : 0
            });
        }
        return { last12Months };
    });
}
exports.getCourseByIDEnrollmentData = getCourseByIDEnrollmentData;
