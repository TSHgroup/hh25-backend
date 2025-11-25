import { Schema, model } from "mongoose";

const schema = new Schema({
    tip: String,
});

export default model('DailyTip', schema);