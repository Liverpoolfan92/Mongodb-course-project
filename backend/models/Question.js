const mongoose = require("mongoose");

/*
 * ARRAY FIELDS  — tags[], votes[]
 * REFERENCING   — authorId → users
 */
const questionSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title:    { type: String, required: true, trim: true },
    body:     { type: String, required: true, trim: true },

    // ARRAY FIELD: масив от низове
    tags: { type: [String], default: [] },

    // ARRAY FIELD: масив от референции към потребители (гласували)
    votes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },

    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

questionSchema.index({ tags: 1 });
questionSchema.index({ title: "text", body: "text" });

module.exports = mongoose.model("Question", questionSchema);
