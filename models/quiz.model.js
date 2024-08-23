"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const commentReplySchema = new mongoose_1.Schema({
    user: Object,
    reply: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const commentSchema = new mongoose_1.Schema({
    user: Object,
    comment: String,
    commentReplies: [commentReplySchema]
}, { timestamps: true });
const questionSchema = new mongoose_1.Schema({
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
const quizSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
const QuizModel = mongoose_1.default.model('Quiz', quizSchema);
exports.default = QuizModel;
