import mongoose, { Document, Model, Schema } from 'mongoose';
import { IUser } from './user.model';

export interface IComment extends Document {
    user: IUser;
    comment: string;
    commentReplies?: IComment[];
}

interface IReview extends Document {
    user: object;
    rating: number;
    review: string;
    reviewReplies: IComment[];
}

export interface ITrack extends Document {
    trackId: mongoose.Schema.Types.ObjectId;
    position: number;
    typeTrack: string;
    userCompleted: Array<{ userId: mongoose.Schema.Types.ObjectId }>;
}

export interface ICourseData extends Document {
    section: String;
    tracks: ITrack[];
}

export interface ICourse extends Document {
    name: string;
    description?: string;
    categoryId: mongoose.Schema.Types.ObjectId;
    price: number;
    estimatedPrice?: number;
    thumbnail: object;
    tags: string;
    level: string;
    demoUrl: string;
    benefits: { title: string }[];
    prerequisites: { title: string }[];
    reviews: IReview[];
    courseData: ICourseData[];
    ratings?: number;
    purchased: number;
    course_creator: mongoose.Schema.Types.ObjectId;
    status: String;
}

const reviewSchema = new Schema<IReview>(
    {
        user: Object,
        rating: {
            type: Number,
            default: 0
        },
        review: String,
        reviewReplies: [Object]
    },
    { timestamps: true }
);

const trackSchema = new Schema<ITrack>({
    trackId: String,
    typeTrack: String,
    position: Number,
    userCompleted: [
        {
            userId: String
        }
    ]
});

const courseDataSchema = new Schema<ICourseData>({
    section: String,
    tracks: [trackSchema]
});

const courseSchema = new Schema<ICourse>(
    {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        price: {
            type: Number
        },
        estimatedPrice: {
            type: Number
        },
        thumbnail: {
            public_id: {
                type: String
            },
            url: {
                type: String
            }
        },
        tags: {
            type: String,
            required: true
        },
        level: {
            type: String,
            required: true
        },
        demoUrl: {
            type: String
        },
        benefits: [{ title: String }],
        prerequisites: [{ title: String }],
        reviews: [reviewSchema],
        courseData: [courseDataSchema],
        ratings: {
            type: Number,
            default: 0
        },
        purchased: {
            type: Number,
            default: 0
        },
        course_creator: {
            type: mongoose.Schema.Types.ObjectId,
            require: true
        },
        status: {
            type: String,
            default: 'published'
        }
    },
    { timestamps: true }
);

const CourseModel: Model<ICourse> = mongoose.model('Course', courseSchema);

export default CourseModel;
