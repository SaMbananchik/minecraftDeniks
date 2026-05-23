import { getDatabase } from "@netlify/database";

const db = getDatabase();

export default async (req) => {
  const method = req.method;
  const headers = { "Content-Type": "application/json" };

  if (method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  try {
    if (method === "GET") {
      const rows = await db.sql`
        SELECT nickname, estate, diamonds, licenses
        FROM players
        ORDER BY diamonds DESC
      `;
      return Response.json(rows, { headers });
    }

    if (method === "POST") {
      const body = await req.json();

      if (body.action === "reset") {
        await db.sql`DELETE FROM players`;
        await db.sql`
          INSERT INTO players (nickname, estate, diamonds, licenses) VALUES
            ('sasha13131', 'Высшая власть', 10000, ARRAY['Шахтёрская', 'Строительная']),
            ('dimon2009', 'Дворянин', 5000, ARRAY['Торговая'])
        `;
        const rows = await db.sql`
          SELECT nickname, estate, diamonds, licenses FROM players ORDER BY diamonds DESC
        `;
        return Response.json(rows, { headers });
      }

      const { nickname, estate, diamonds, licenses } = body;
      if (!nickname) {
        return Response.json({ error: "Ник обязателен" }, { status: 400, headers });
      }

      const rows = await db.sql`
        INSERT INTO players (nickname, estate, diamonds, licenses)
        VALUES (${nickname}, ${estate}, ${diamonds}, ${licenses})
        RETURNING nickname, estate, diamonds, licenses
      `;
      return Response.json(rows[0], { status: 201, headers });
    }

    if (method === "PUT") {
      const { nickname, estate, diamonds, licenses } = await req.json();
      const rows = await db.sql`
        UPDATE players
        SET estate = ${estate}, diamonds = ${diamonds}, licenses = ${licenses}
        WHERE nickname = ${nickname}
        RETURNING nickname, estate, diamonds, licenses
      `;
      if (!rows.length) {
        return Response.json({ error: "Игрок не найден" }, { status: 404, headers });
      }
      return Response.json(rows[0], { headers });
    }

    if (method === "DELETE") {
      const { nickname } = await req.json();
      await db.sql`DELETE FROM players WHERE nickname = ${nickname}`;
      return Response.json({ success: true }, { headers });
    }

    return new Response("Method not allowed", { status: 405, headers });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
};

export const config = { path: "/api/players" };
