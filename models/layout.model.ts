import { Schema, model, Document } from 'mongoose';

export interface FaqItem extends Document {
    question: string;
    answer: string;
}

export interface Category extends Document {
    title: string;
}

export interface BannerImage extends Document {
    public_id: string;
    url: string;
}

export interface RulesItem extends Document {
    title: string;
    content: string;
}

interface Layout extends Document {
    type: string;
    faq: FaqItem[];
    categories: Category[];
    rules: RulesItem[];
    banner: {
        image: BannerImage;
        title: string;
        subTitle: string;
    };
}

const faqSchema = new Schema<FaqItem>({
    question: { type: String },
    answer: { type: String }
});

const categorySchema = new Schema<Category>({
    title: { type: String }
});

const bannerImageSchema = new Schema<BannerImage>({
    public_id: { type: String },
    url: { type: String }
});

const rulesSchema = new Schema<RulesItem>({
    title: { type: String },
    content: { type: String }
});

const layoutSchema = new Schema<Layout>({
    type: { type: String },
    faq: [faqSchema],
    categories: [categorySchema],
    rules: [rulesSchema],
    banner: {
        image: bannerImageSchema,
        title: { type: String },
        subTitle: { type: String }
    }
});

const LayoutModel = model<Layout>('Layout', layoutSchema);

export default LayoutModel;
