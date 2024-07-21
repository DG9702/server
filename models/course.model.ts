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
    comment: string;
    commentReplies: IComment[];
}

export interface ITrack extends Document {
    trackId: String;
    position: number;
    typeTrack: string;
    title: String;
    duration: number;
}

export interface ICourseData extends Document {
    section: String;
    tracks: ITrack[];
}

export interface ICourse extends Document {
    name: string;
    description?: string;
    categories: string;
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
}

const reviewSchema = new Schema<IReview>({
    user: Object,
    rating: {
        type: Number,
        default: 0
    },
    comment: String,
    commentReplies: [Object]
});

const courseDataSchema = new Schema<ICourseData>({
    section: String,
    tracks: [Object]
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
        categories: {
            type: String
            //required: true,
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
        }
    },
    { timestamps: true }
);

const CourseModel: Model<ICourse> = mongoose.model('Course', courseSchema);

export default CourseModel;
