const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true },
    email:          { type: String, required: true, unique: true },
    avatarInitials: { type: String, required: true },
    color:          { type: String, default: "#1D9E75" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
