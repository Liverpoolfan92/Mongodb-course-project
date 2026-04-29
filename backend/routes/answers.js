const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const Answer   = require("../models/Answer");

// POST /api/answers/:id/vote
router.post("/:id/vote", async (req, res) => {
  try {
    const { userId } = req.body;
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ error: "Не е намерен" });

    const uid      = new mongoose.Types.ObjectId(userId);
    const hasVoted = answer.votes.some(v => v.equals(uid));

    const updated = await Answer.findByIdAndUpdate(
      req.params.id,
      hasVoted ? { $pull: { votes: uid } } : { $addToSet: { votes: uid } },
      { new: true }
    );
    res.json({ votes: updated.votes, voteCount: updated.votes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/answers/:id/accept
router.patch("/:id/accept", async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ error: "Не е намерен" });

    await Answer.updateMany({ questionId: answer.questionId }, { $set: { isAccepted: false } });
    const updated = await Answer.findByIdAndUpdate(
      req.params.id,
      { $set: { isAccepted: true } },
      { new: true }
    ).populate("authorId", "name avatarInitials color");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/answers/stats — aggregation: $group, $avg, $sum
router.get("/stats", async (req, res) => {
  try {
    const stats = await Answer.aggregate([
      {
        $group: {
          _id:         "$questionId",
          answerCount: { $sum: 1 },
          avgVotes:    { $avg: { $size: "$votes" } },
          totalVotes:  { $sum: { $size: "$votes" } },
          hasAccepted: { $max: { $cond: ["$isAccepted", 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "questions", localField: "_id",
          foreignField: "_id", as: "question",
        },
      },
      { $unwind: "$question" },
      {
        $project: {
          "question.title": 1,
          answerCount: 1,
          avgVotes:    { $round: ["$avgVotes", 1] },
          totalVotes:  1,
          hasAccepted: 1,
        },
      },
      { $sort: { answerCount: -1 } },
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
