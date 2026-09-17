'use server';

import { createClient } from '@/lib/supabase/server';
import { query, withTransaction } from '@/server/db/pool';
import { User } from '@/core/types/database';
import { cookies } from 'next/headers';
import { USER_ID_COOKIE, USER_NAME_COOKIE, clearUserSession } from '@/server/auth/session';

export interface AuthActionResult {
  success: boolean;
  message: string;
  user?: User;
  requiresEmailConfirmation?: boolean;
}

/**
 * Ensures an authenticated Supabase user exists in `public.users` table
 * and links any previous guest data associated with this email or cookie.
 */
export async function syncAuthenticatedUser(
  sbUser: { id: string; email?: string; user_metadata?: Record<string, any> },
  preferredDisplayName?: string
): Promise<User> {
  const email = sbUser.email?.toLowerCase().trim();
  const displayName =
    preferredDisplayName?.trim() ||
    sbUser.user_metadata?.display_name ||
    sbUser.user_metadata?.full_name ||
    email?.split('@')[0] ||
    'Player';

  const avatarUrl =
    sbUser.user_metadata?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

  // Check if user exists by auth_id or email
  const existingRes = await query(
    `SELECT id, auth_id, display_name, email, avatar_url, created_at, updated_at
     FROM users
     WHERE auth_id = $1 OR (email = $2 AND email IS NOT NULL)`,
    [sbUser.id, email || '']
  );

  let user: User;

  if (existingRes.rows.length > 0) {
    user = existingRes.rows[0] as User;

    const needsAuthIdUpdate = user.auth_id !== sbUser.id;
    const needsNameUpdate = Boolean(preferredDisplayName && user.display_name !== preferredDisplayName);

    if (needsAuthIdUpdate || needsNameUpdate) {
      const newName = preferredDisplayName || user.display_name;
      await query(
        `UPDATE users 
         SET auth_id = $1, display_name = $2, updated_at = NOW() 
         WHERE id = $3`,
        [sbUser.id, newName, user.id]
      );
      user.auth_id = sbUser.id;
      user.display_name = newName;
    }
  } else {
    // Insert new authenticated user record
    const insertRes = await query(
      `INSERT INTO users (auth_id, display_name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, auth_id, display_name, email, avatar_url, created_at, updated_at`,
      [sbUser.id, displayName, email || `${sbUser.id}@groupbet.internal`, avatarUrl]
    );
    user = insertRes.rows[0] as User;
  }

  // Check if the browser held a guest cookie that can be merged into this user
  try {
    const cookieStore = await cookies();
    const guestUserId = cookieStore.get(USER_ID_COOKIE)?.value;

    if (guestUserId && guestUserId !== user.id) {
      // Transfer any leagues, entries, and picks from the guest to this authenticated account
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE league_members SET user_id = $1 WHERE user_id = $2 ON CONFLICT DO NOTHING`,
          [user.id, guestUserId]
        );
        await client.query(
          `UPDATE lms_entries SET user_id = $1 WHERE user_id = $2 ON CONFLICT DO NOTHING`,
          [user.id, guestUserId]
        );
        await client.query(
          `UPDATE predictor_picks SET user_id = $1 WHERE user_id = $2 ON CONFLICT DO NOTHING`,
          [user.id, guestUserId]
        );
        await client.query(
          `UPDATE predictor_leaderboard SET user_id = $1 WHERE user_id = $2 ON CONFLICT DO NOTHING`,
          [user.id, guestUserId]
        );
      });
    }

    // Set active session cookies to the authenticated user
    cookieStore.set(USER_ID_COOKIE, user.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });

    cookieStore.set(USER_NAME_COOKIE, user.display_name, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch {
    // Contexts where cookies are not writable
  }

  return user;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(formData: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const { email, password } = formData;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return {
        success: false,
        message: error?.message || 'Invalid email or password.',
      };
    }

    const appUser = await syncAuthenticatedUser(data.user);

    return {
      success: true,
      message: 'Signed in successfully!',
      user: appUser,
    };
  } catch (err: any) {
    console.error('[signInWithPassword] Error:', err);
    return {
      success: false,
      message: err?.message || 'Failed to sign in. Please try again.',
    };
  }
}

/**
 * Sign up with email, password, and display name
 */
export async function signUpWithPassword(formData: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthActionResult> {
  const { email, password, displayName } = formData;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Could not create account.',
      };
    }

    // If session is present, user is signed in immediately
    if (data.session) {
      const appUser = await syncAuthenticatedUser(data.user, displayName);
      return {
        success: true,
        message: 'Account created and signed in!',
        user: appUser,
      };
    }

    // If email confirmation is required
    return {
      success: true,
      message: 'Account created! Please check your email to confirm your account.',
      requiresEmailConfirmation: true,
    };
  } catch (err: any) {
    console.error('[signUpWithPassword] Error:', err);
    return {
      success: false,
      message: err?.message || 'Failed to register account.',
    };
  }
}

/**
 * Sign in using Magic Link (Passwordless OTP)
 */
export async function sendMagicLink(formData: {
  email: string;
}): Promise<AuthActionResult> {
  const { email } = formData;

  try {
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${appUrl}/api/auth/callback`,
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
      message: 'Magic link sent! Check your inbox to sign in.',
    };
  } catch (err: any) {
    console.error('[sendMagicLink] Error:', err);
    return {
      success: false,
      message: err?.message || 'Failed to send magic link.',
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    await clearUserSession();

    return {
      success: true,
      message: 'Signed out successfully.',
    };
  } catch (err: any) {
    console.error('[signOut] Error:', err);
    await clearUserSession();
    return {
      success: true,
      message: 'Signed out.',
    };
  }
}
