import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
    user_id: String,
    meetingCode: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;