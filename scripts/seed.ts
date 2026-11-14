import { randomUUID } from "crypto";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const councilId = randomUUID();
    await client.query(
      `INSERT INTO councils (id, code, name, country)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, country = EXCLUDED.country`,
      [councilId, "NCK", "Nursing Council of Kenya", "Kenya"],
    );
    const { rows: councilRows } = await client.query<{ id: string }>(
      "SELECT id FROM councils WHERE code = $1",
      ["NCK"],
    );
    const resolvedCouncilId = councilRows[0]!.id;

    const subjectId = randomUUID();
    await client.query(
      `INSERT INTO subjects (id, council_id, name, weight_bps, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (council_id, name) DO UPDATE SET weight_bps = EXCLUDED.weight_bps, sort_order = EXCLUDED.sort_order`,
      [subjectId, resolvedCouncilId, "Maternal & Child Health", 2500, 1],
    );
    const { rows: subjectRows } = await client.query<{ id: string }>(
      "SELECT id FROM subjects WHERE council_id = $1 AND name = $2",
      [resolvedCouncilId, "Maternal & Child Health"],
    );
    const resolvedSubjectId = subjectRows[0]!.id;

    const { rows: existingTopicRows } = await client.query<{ id: string }>(
      "SELECT id FROM topics WHERE subject_id = $1 AND name = $2",
      [resolvedSubjectId, "Antenatal Care"],
    );
    let resolvedTopicId = existingTopicRows[0]?.id;
    if (!resolvedTopicId) {
      resolvedTopicId = randomUUID();
      await client.query(
        `INSERT INTO topics (id, subject_id, name, syllabus_code)
         VALUES ($1, $2, $3, $4)`,
        [resolvedTopicId, resolvedSubjectId, "Antenatal Care", "MCH-ANC"],
      );
    }

    const questions: Array<{
      id: string;
      stem: string;
      explanation: string;
      reference: string;
      choices: Array<{ label: string; body: string; correct: boolean }>;
    }> = [
      {
        id: randomUUID(),
        stem: "At what gestational age is the first focused antenatal care visit recommended in Kenya for an uncomplicated pregnancy?",
        explanation:
          "Focused antenatal care recommends the first visit before 16 weeks of gestation to allow early risk identification, baseline assessment, and timely interventions.",
        reference: "Kenya FANC guidelines",
        choices: [
          { label: "A", body: "Before 16 weeks", correct: true },
          { label: "B", body: "At 20 weeks", correct: false },
          { label: "C", body: "At 28 weeks", correct: false },
          { label: "D", body: "Only in the third trimester", correct: false },
        ],
      },
      {
        id: randomUUID(),
        stem: "Which supplement is routinely recommended during pregnancy to reduce the risk of maternal anaemia and neural tube defects?",
        explanation:
          "Daily iron and folic acid supplementation supports maternal haemoglobin levels and folic acid reduces the risk of neural tube defects when taken appropriately.",
        reference: "WHO antenatal care recommendations",
        choices: [
          { label: "A", body: "Vitamin C only", correct: false },
          { label: "B", body: "Iron and folic acid", correct: true },
          { label: "C", body: "Calcium only", correct: false },
          { label: "D", body: "Vitamin A in high doses", correct: false },
        ],
      },
    ];

    for (const q of questions) {
      const { rows: existing } = await client.query<{ id: string; kind: string }>(
        "SELECT id, kind FROM questions WHERE topic_id = $1 AND stem = $2",
        [resolvedTopicId, q.stem],
      );
      let questionId = existing[0]?.id;
      if (existing[0] && existing[0].kind !== "single") {
        throw new Error(`Question "${q.stem}" already exists with kind ${existing[0].kind}; expected single`);
      }
      if (!questionId) {
        questionId = q.id;
        await client.query(
          `INSERT INTO questions (id, topic_id, kind, stem, explanation, reference, published, difficulty)
           VALUES ($1, $2, 'single', $3, $4, $5, true, 2)`,
          [questionId, resolvedTopicId, q.stem, q.explanation, q.reference],
        );
      } else {
        await client.query(
          `UPDATE questions
           SET explanation = $2, reference = $3, difficulty = 2
           WHERE id = $1`,
          [questionId, q.explanation, q.reference],
        );
      }

      for (let i = 0; i < q.choices.length; i++) {
        const c = q.choices[i]!;
        await client.query(
          `INSERT INTO choices (id, question_id, label, body, correct, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (question_id, label) DO UPDATE SET body = EXCLUDED.body, correct = EXCLUDED.correct, sort_order = EXCLUDED.sort_order`,
          [randomUUID(), questionId, c.label, c.body, c.correct, i],
        );
      }
    }

    await client.query("COMMIT");
    console.log("Seed completed: councils, subjects, topics, and sample questions ensured");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
