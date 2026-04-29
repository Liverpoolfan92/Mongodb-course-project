const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const Question = require("../models/Question");
const Answer   = require("../models/Answer");

// GET /api/questions — aggregation pipeline
router.get("/", async (req, res) => {
  try {
    const { sort = "votes", tag } = req.query;
    const matchStage = tag ? { tags: tag } : {};

    const questions = await Question.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "answers", localField: "_id",
          foreignField: "questionId", as: "answers",
        },
      },
      {
        $lookup: {
          from: "users", localField: "authorId",
          foreignField: "_id", as: "author",
        },
      },
      { $unwind: "$author" },
      {
        $addFields: {
          voteCount:   { $size: "$votes" },
          answerCount: { $size: "$answers" },
          hasAccepted: { $in: [true, "$answers.isAccepted"] },
        },
      },
      {
        $project: {
          title: 1, body: 1, tags: 1, votes: 1,
          views: 1, createdAt: 1, voteCount: 1,
          answerCount: 1, hasAccepted: 1,
          "author._id": 1, "author.name": 1,
          "author.avatarInitials": 1, "author.color": 1,
        },
      },
      {
        $sort:
          sort === "votes"   ? { voteCount: -1, createdAt: -1 } :
          sort === "answers" ? { answerCount: -1, createdAt: -1 } :
                               { createdAt: -1 },
      },
    ]);

    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/questions/:id
router.get("/:id", async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("authorId", "name avatarInitials color");

    if (!question) return res.status(404).json({ error: "Не е намерен" });

    const answers = await Answer.find({ questionId: req.params.id })
      .populate("authorId", "name avatarInitials color")
      .sort({ isAccepted: -1, createdAt: 1 });

    res.json({ question, answers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/questions
router.post("/", async (req, res) => {
  try {
    const { title, body, tags, authorId } = req.body;
    const tagsArray = Array.isArray(tags)
      ? tags
      : String(tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);

    const question = await Question.create({ title, body, tags: tagsArray, authorId });
    await question.populate("authorId", "name avatarInitials color");
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/questions/:id/vote  — $addToSet / $pull върху votes[]
router.post("/:id/vote", async (req, res) => {
  try {
    const { userId } = req.body;
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: "Не е намерен" });

    const uid      = new mongoose.Types.ObjectId(userId);
    const hasVoted = question.votes.some(v => v.equals(uid));

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      hasVoted ? { $pull: { votes: uid } } : { $addToSet: { votes: uid } },
      { new: true }
    );
    res.json({ votes: updated.votes, voteCount: updated.votes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/questions/:id/answers
router.post("/:id/answers", async (req, res) => {
  try {
    const { body, authorId } = req.body;
    const answer = await Answer.create({ questionId: req.params.id, authorId, body });
    await answer.populate("authorId", "name avatarInitials color");
    res.status(201).json(answer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
