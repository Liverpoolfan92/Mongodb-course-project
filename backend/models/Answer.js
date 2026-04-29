const mongoose = require("mongoose");

/*
 * REFERENCING — questionId → questions, authorId → users
 * ARRAY FIELD — votes[]
 */
const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    authorId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body:       { type: String, required: true, trim: true },
    votes:      { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    isAccepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

answerSchema.index({ questionId: 1, createdAt: -1 });

module.exports = mongoose.model("Answer", answerSchema);
