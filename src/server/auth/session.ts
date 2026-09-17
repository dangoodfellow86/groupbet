import { cookies } from 'next/headers';
import { query } from '@/server/db/pool';
import { User } from '@/core/types/database';

export const USER_ID_COOKIE = 'gb_user_id';
export const USER_NAME_COOKIE = 'gb_user_name';

/**
 * Retrieve the current active user from Supabase Auth or the session cookie and DB.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // 1. Try resolving authenticated Supabase user
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user: sbUser } } = await supabase.auth.getUser();

      if (sbUser) {
        const res = await query(
          `SELECT id, auth_id, display_name, email, avatar_url, created_at, updated_at 
           FROM users 
           WHERE auth_id = $1 OR (email = $2 AND email IS NOT NULL)
           LIMIT 1`,
          [sbUser.id, sbUser.email || '']
        );

        if (res.rows.length > 0) {
          const user = res.rows[0] as User;
          if (user.auth_id !== sbUser.id) {
            await query(`UPDATE users SET auth_id = $1 WHERE id = $2`, [sbUser.id, user.id]);
            user.auth_id = sbUser.id;
          }
          return user;
        } else {
          const displayName =
            sbUser.user_metadata?.display_name ||
            sbUser.user_metadata?.full_name ||
            sbUser.email?.split('@')[0] ||
            'Player';
          const avatarUrl =
            sbUser.user_metadata?.avatar_url ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

          const insertRes = await query(
            `INSERT INTO users (auth_id, display_name, email, avatar_url)
             VALUES ($1, $2, $3, $4)
             RETURNING id, auth_id, display_name, email, avatar_url, created_at, updated_at`,
            [sbUser.id, displayName, sbUser.email || `${sbUser.id}@groupbet.internal`, avatarUrl]
          );
          return insertRes.rows[0] as User;
        }
      }
    } catch {
      // Supabase not available or outside request scope, fallback to cookie
    }

    // 2. Fallback to guest cookie session
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_ID_COOKIE)?.value;

    if (!userId) {
      return null;
    }

    const res = await query(
      `SELECT id, auth_id, display_name, email, avatar_url, created_at, updated_at 
       FROM users 
       WHERE id::text = $1`,
      [userId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0] as User;
  } catch (error: any) {
    if (!error?.message?.includes('outside a request scope')) {
      console.error('[getCurrentUser] Error resolving user session:', error);
    }
    return null;
  }
}

/**
 * Find or create a user in PostgreSQL by display name or email,
 * and set the session cookies.
 */
export async function getOrCreateUser(
  displayName: string,
  email?: string,
  authId?: string
): Promise<User> {
  const cleanName = displayName.trim() || 'Anonymous Player';
  const cleanEmail =
    email?.trim().toLowerCase() ||
    `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@groupbet.internal`;
  const resolvedAuthId =
    authId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Check if user with this email or auth_id already exists
  const existingRes = await query(
    `SELECT id, auth_id, display_name, email, avatar_url, created_at, updated_at 
     FROM users 
     WHERE email = $1 OR (auth_id = $2 AND auth_id NOT LIKE 'guest_%')`,
    [cleanEmail, resolvedAuthId]
  );

  let user: User;

  if (existingRes.rows.length > 0) {
    user = existingRes.rows[0] as User;
    // Update display name if changed
    if (user.display_name !== cleanName) {
      await query(
        `UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2`,
        [cleanName, user.id]
      );
      user.display_name = cleanName;
    }
  } else {
    // 2. Create new user
    const insertRes = await query(
      `INSERT INTO users (auth_id, display_name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, auth_id, display_name, email, avatar_url, created_at, updated_at`,
      [
        resolvedAuthId,
        cleanName,
        cleanEmail,
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`
      ]
    );
    user = insertRes.rows[0] as User;
  }

  // 3. Set cookies
  try {
    const cookieStore = await cookies();
    cookieStore.set(USER_ID_COOKIE, user.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    cookieStore.set(USER_NAME_COOKIE, user.display_name, {
      path: '/',
      httpOnly: false, // Accessible to client components for display
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch {
    // If called outside server action / route handler context (e.g. tests), ignore cookie set error
  }

  return user;
}

/**
 * Clear the current user session cookies.
 */
export async function clearUserSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(USER_ID_COOKIE);
    cookieStore.delete(USER_NAME_COOKIE);
  } catch (error) {
    console.error('[clearUserSession] Error clearing cookies:', error);
  }
}
