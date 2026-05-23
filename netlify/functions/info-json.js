import { getDatabase } from "@netlify/database";

const db = getDatabase();

export default async () => {
  try {
    const rows = await db.sql`
      SELECT nickname, estate, diamonds, licenses
      FROM players
      ORDER BY diamonds DESC
    `;
    return Response.json(rows, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Не удалось получить данные" }, { status: 500 });
  }
};

export const config = { path: "/info.json" };
