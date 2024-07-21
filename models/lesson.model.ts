import mongoose, { Document, Model, Schema } from 'mongoose';
import { IComment } from './course.model';

export interface ILesson extends Document {
    courseId: String;
    section: String;
    typeTrack: String;
    title: string;
    description: string;
    videoUrl: string;
    videoThumbnail: object;
    duration: number;
    links?: ILink[];
    suggestion: string;
    comments: IComment[];
}

export interface ILink extends Document {
    title: string;
    url: string;
}

export interface ICommentReply {
    user: Object;
    reply: String;
    createdAt: Date;
}

const linkSchema = new Schema<ILink>({
    title: String,
    url: String
});

const commentReplySchema = new Schema<ICommentReply>({
    user: Object,
    reply: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const commentSchema = new Schema<IComment>({
    user: Object,
    comment: String,
    commentReplies: [commentReplySchema]
});

const lessonSchema = new Schema<ILesson>(
    {
        courseId: {
            type: String
        },
        section: {
            type: String
        },
        typeTrack: {
            type: String
        },
        title: {
            type: String
            //required: true,
        },
        description: {
            type: String
            //required: true,
        },
        videoUrl: {
            type: String
            //required: true,
        },
        duration: {
            type: Number
            //required: true,
        },
        links: [linkSchema],
        comments: [commentSchema],
        suggestion: {
            type: String
        }
    },
    { timestamps: true }
);

const LessonModel: Model<ILesson> = mongoose.model('lesson', lessonSchema);

export default LessonModel;
