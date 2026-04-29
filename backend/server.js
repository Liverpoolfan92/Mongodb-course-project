require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");

const questionRoutes = require("./routes/questions");
const answerRoutes   = require("./routes/answers");
const User           = require("./models/User");
const Question       = require("./models/Question");
const Answer         = require("./models/Answer");

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/questions", questionRoutes);
app.use("/api/answers",   answerRoutes);

app.get("/api/users", async (req, res) => {
  const users = await User.find().sort({ name: 1 });
  res.json(users);
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/qa_forum";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log(`✅  MongoDB свързан: ${MONGO_URI}`);
    await seed();
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀  Backend: http://0.0.0.0:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌  MongoDB грешка:", err.message);
    process.exit(1);
  });

// ── Seed ────────────────────────────────────────────────────────────────────
// Фиксирани ObjectId-та — съвпадат с users.json / questions.json / answers.json
async function seed() {
  const count = await User.countDocuments();
  if (count > 0) {
    console.log("🌱  Seed пропуснат — базата вече съдържа данни");
    return;
  }

  const oid = (id) => new mongoose.Types.ObjectId(id);

  const U1 = oid("665f000000000000000000a1");
  const U2 = oid("665f000000000000000000a2");
  const U3 = oid("665f000000000000000000a3");
  const U4 = oid("665f000000000000000000a4");

  const Q1 = oid("665f000000000000000000b1");
  const Q2 = oid("665f000000000000000000b2");
  const Q3 = oid("665f000000000000000000b3");

  // ── Users ──────────────────────────────────────────────────────────────
  await User.insertMany([
    { _id: U1, name: "Georgi Ivanov",   email: "georgi@example.com", avatarInitials: "GI", color: "#1D9E75" },
    { _id: U2, name: "Maria Petrova",   email: "maria@example.com",  avatarInitials: "MP", color: "#7F77DD" },
    { _id: U3, name: "Ivan Dimitrov",   email: "ivan@example.com",   avatarInitials: "ID", color: "#D85A30" },
    { _id: U4, name: "Elena Stoyanova", email: "elena@example.com",  avatarInitials: "ES", color: "#D4537E" },
  ]);

  // ── Questions ───────────────────────────────────────────────────────────
  await Question.insertMany([
    {
      _id:       Q1,
      authorId:  U1,
      title:     "Как работи aggregation pipeline в MongoDB?",
      body:      "Опитвам се да разбера как да групирам документи и да изчислявам статистики. Може ли някой да обясни стъпките?",
      tags:      ["mongodb", "aggregation", "nosql"],
      votes:     [U2, U3, U4],
      views:     42,
      createdAt: new Date(Date.now() - 1000 * 3600 * 24),
    },
    {
      _id:       Q2,
      authorId:  U2,
      title:     "Каква е разликата между embedding и referencing в MongoDB?",
      body:      "Кога да embed-вам документи и кога да използвам референции с ObjectId? Какви са компромисите?",
      tags:      ["mongodb", "schema-design", "referencing"],
      votes:     [U1, U3],
      views:     28,
      createdAt: new Date(Date.now() - 1000 * 3600 * 10),
    },
    {
      _id:       Q3,
      authorId:  U3,
      title:     "Как да съхранявам array полета ефективно в MongoDB?",
      body:      "Трябва ми да пазя списък от тагове и ID-та на потребители, харесали пост. Правилен ли е подходът с array полета?",
      tags:      ["mongodb", "arrays", "schema"],
      votes:     [U1],
      views:     15,
      createdAt: new Date(Date.now() - 1000 * 3600 * 2),
    },
  ]);

  // ── Answers ─────────────────────────────────────────────────────────────
  await Answer.insertMany([
    {
      _id:        oid("665f000000000000000000c1"),
      questionId: Q1,
      authorId:   U2,
      body:       "Pipeline-ът се състои от стъпки като $match, $group, $sort и $project. Всяка стъпка трансформира документите. Например $group с $sum изчислява суми, а $avg — средни стойности.",
      votes:      [U1, U3, U4],
      isAccepted: true,
      createdAt:  new Date(Date.now() - 1000 * 3600 * 20),
    },
    {
      _id:        oid("665f000000000000000000c2"),
      questionId: Q1,
      authorId:   U4,
      body:       "Мисли за него като Unix pipeline — документите минават през стъпките и се трансформират. Можеш да използваш $lookup за join на колекции и $unwind за разгъване на масиви.",
      votes:      [U2],
      isAccepted: false,
      createdAt:  new Date(Date.now() - 1000 * 3600 * 18),
    },
    {
      _id:        oid("665f000000000000000000c3"),
      questionId: Q2,
      authorId:   U1,
      body:       "Embed-вай когато данните винаги се достъпват заедно и имат 1-to-few връзка. Referencing е по-добро когато данните се споделят между много документи или растат неограничено.",
      votes:      [U2, U3],
      isAccepted: true,
      createdAt:  new Date(Date.now() - 1000 * 3600 * 8),
    },
    {
      _id:        oid("665f000000000000000000c4"),
      questionId: Q3,
      authorId:   U4,
      body:       "Да, array полетата са правилният подход. MongoDB създава multikey индекс върху масива, така че всеки елемент се индексира поотделно. Използвай $addToSet за добавяне без дублиране и $pull за премахване.",
      votes:      [U1, U2],
      isAccepted: false,
      createdAt:  new Date(Date.now() - 1000 * 3600 * 1),
    },
  ]);

  console.log("🌱  Seed завършен: 4 потребители, 3 въпроса, 4 отговора");
}