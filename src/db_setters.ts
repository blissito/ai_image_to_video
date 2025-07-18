import { db } from "./db/turso.js";

export const updateUserCredits = async ({
  email,
  credits,
  videoId,
}: {
  email: string;
  credits: number;
  videoId?: string;
}) => {
  // Check if user exists
  const existingUser = await getUser(email);

  if (!existingUser) {
    // User doesn't exist, create them
    console.log("Usuario no encontrado:", email);
    const videoIds = videoId ? [videoId] : [];
    const initialCredits = Math.max(0, credits); // Ensure credits are not negative for new users
    await db.execute({
      sql: `INSERT INTO users (email, credits, video_ids, bucket_links, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        email,
        initialCredits,
        JSON.stringify(videoIds),
        JSON.stringify([]),
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });
    return true;
  }

  // Update existing user
  const newCredits = existingUser.credits + credits;
  const finalCredits = newCredits < 0 ? 0 : newCredits;

  let updatedVideoIds = existingUser.videoIds;
  if (videoId) {
    updatedVideoIds = [...existingUser.videoIds, videoId];
  }

  await db.execute({
    sql: `UPDATE users SET credits = ?, video_ids = ?, updated_at = ? WHERE email = ?`,
    args: [
      finalCredits,
      JSON.stringify(updatedVideoIds),
      new Date().toISOString(),
      email,
    ],
  });

  console.log(
    `Créditos actualizados para ${email}. Nuevo total: ${finalCredits}`
  );
};

export const getUser = async (email: string) => {
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as number,
    name: row.name as string,
    email: row.email as string,
    credits: row.credits as number,
    videoIds: JSON.parse((row.video_ids as string) || "[]"),
    bucketLinks: JSON.parse((row.bucket_links as string) || "[]"),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: row.deleted_at as string | null,
  };
};

export const sufficientCredits = async (email: string, credits: number = 0) => {
  const user = await getUser(email);
  if (!user) {
    return false;
  }
  return user.credits >= Math.abs(credits);
};

export const addBucketLinkToUser = async ({
  email,
  link,
  credits = 0,
}: {
  email: string;
  link: string;
  credits?: number;
}) => {
  const user = await getUser(email);
  if (!user) {
    throw new Error("User not found");
  }
  const updatedBucketLinks = [...user.bucketLinks, link];
  return updateUserLinks(email, updatedBucketLinks, credits);
};

export const updateUserLinks = async (
  email: string,
  bucketLinks: string[],
  credits: number
) => {
  const user = await getUser(email);
  if (!user) {
    console.error("User not found:", email);
    throw new Error("User not found");
  }

  // Validate enough credits
  if (user.credits < credits) {
    throw new Error("Not enough credits");
  }

  await db.execute({
    sql: `UPDATE users SET bucket_links = ?, updated_at = ? WHERE email = ?`,
    args: [JSON.stringify(bucketLinks), new Date().toISOString(), email],
  });

  console.info("Wrote bucket links for", email);
};
