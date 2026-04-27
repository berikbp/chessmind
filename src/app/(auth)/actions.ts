"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/app/(auth)/auth-action-state";

function getSafeRedirectPath(formData: FormData) {
  const redirectedFrom = String(formData.get("redirectedFrom") ?? "").trim();

  if (
    redirectedFrom.startsWith("/") &&
    !redirectedFrom.startsWith("//") &&
    !redirectedFrom.startsWith("/login") &&
    !redirectedFrom.startsWith("/register") &&
    !redirectedFrom.startsWith("/confirm-email")
  ) {
    return redirectedFrom === "/" ? "/lobby" : redirectedFrom;
  }

  return "/lobby";
}

function mapAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (message.includes("Database error saving new user")) {
    return "Signup reached Supabase, but the auth trigger failed while creating the profile row. Run the SQL fix for `handle_new_user` in Supabase SQL Editor, then try again.";
  }

  if (normalized.includes("duplicate key") || normalized.includes("profiles_username_key")) {
    return "That username is already taken.";
  }

  return message;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mapAuthErrorMessage(error.message) };
  }

  return { error: null, redirectTo: getSafeRedirectPath(formData) };
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (username.length < 3) return { error: "Username must be at least 3 characters long." };
  if (!city) return { error: "Pick your city or type it manually." };
  if (!email) return { error: "Email is required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters long." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { city, username } },
  });

  if (error) {
    return { error: mapAuthErrorMessage(error.message) };
  }

  if (data.session) {
    return { error: null, redirectTo: "/lobby" };
  }

  return { error: null, redirectTo: `/confirm-email?email=${encodeURIComponent(email)}` };
}
