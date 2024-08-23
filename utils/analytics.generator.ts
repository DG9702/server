import { Document, Model } from 'mongoose';

interface MonthData {
    month: string;
    count: number;
}

export async function generateLast12MothsData<T extends Document>(
    model: Model<T>
): Promise<{ last12Months: MonthData[] }> {
    const last12Months: MonthData[] = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);

    for (let i = 11; i >= 0; i--) {
        const endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - i * 28
        );
        const startDate = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate() - 28
        );

        const monthYear = endDate.toLocaleString('default', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const count = await model.countDocuments({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        });

        last12Months.push({ month: monthYear, count });
    }

    return { last12Months };
}

interface MonthData {
    month: string;
    count: number;
}

export async function generateLast12MonthsRevenueData<T extends Document>(
    model: Model<T>
): Promise<{ last12Months: MonthData[] }> {
    const last12Months: MonthData[] = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);

    for (let i = 11; i >= 0; i--) {
        const endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - i * 28
        );
        const startDate = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate() - 28
        );

        const monthYear = endDate.toLocaleString('default', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const revenueData = await model.aggregate([
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
}

interface CourseEnrollment {
    courseId: string;
    count: number;
}

export async function generateCurrentYearCourseEnrollments(
    model: Model<any>
): Promise<CourseEnrollment[]> {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear + 1, 0, 1);

    const enrollmentsData = await model.aggregate([
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
}

interface CourseEnrollment {
    month: number;
    count: number;
}

export async function getCourseByIDEnrollmentData(
    model: Model<any>,
    courseId: string
): Promise<{ last12Months: MonthData[] }> {
    const last12Months: MonthData[] = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);

    for (let i = 11; i >= 0; i--) {
        const endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - i * 28
        );
        const startDate = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate() - 28
        );

        const monthYear = endDate.toLocaleString('vi', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const enrollmentData = await model.aggregate([
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
}
