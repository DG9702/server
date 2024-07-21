import mongoose, { Document, Model, Schema } from 'mongoose';
import { IComment } from './course.model';

interface IQuestion extends Document {
    answer: string;
    explanation: string;
    is_Correct: boolean;
}

export interface IQuiz extends Document {
    courseId: String;
    section: string;
    typeTrack: String;
    title: string;
    description: string;
    duration: number;
    content: string;
    questions: IQuestion[];
    comments: IComment[];
}

export interface ICommentReply {
    user: Object;
    reply: String;
    createdAt: Date;
}

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

const questionSchema = new Schema<IQuestion>({
    answer: {
        type: String,
        required: true
    },
    explanation: {
        type: String
    },
    is_Correct: {
        type: Boolean
    }
});

const quizSchema = new Schema<IQuiz>(
    {
        courseId: {
            type: String
        },
        section: {
            type: String
            //required: true,
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
        duration: {
            type: Number
        },
        content: {
            type: String
            //required: true,
        },
        questions: [questionSchema],
        comments: [commentSchema]
    },
    { timestamps: true }
);

const QuizModel: Model<IQuiz> = mongoose.model('Quiz', quizSchema);

export default QuizModel;
