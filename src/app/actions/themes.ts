"use server";

import { revalidatePath } from "next/cache";

import { getAllowedSession } from "@/auth/session";
import {
  deleteThemeForUser,
  duplicateThemeForUser,
  setDefaultThemeForUser,
  toggleFavoriteThemeForUser,
  updateThemeForUser,
} from "@/db/queries/themes";
import {
  duplicateThemeInputSchema,
  themePreferenceInputSchema,
  updateThemeInputSchema,
} from "@/themes/model";

export async function duplicateThemeAction(input: unknown) {
  const session = await getAllowedSession();
  const parsed = duplicateThemeInputSchema.safeParse(input);
  if (!session || !parsed.success) return { ok: false as const, message: "That theme could not be duplicated." };
  const theme = await duplicateThemeForUser(parsed.data.themeId, session.user.id);
  if (!theme) return { ok: false as const, message: "That theme was not found." };
  revalidatePath("/");
  return { ok: true as const, themeId: theme.id };
}

export async function updateThemeAction(input: unknown) {
  const session = await getAllowedSession();
  const parsed = updateThemeInputSchema.safeParse(input);
  if (!session || !parsed.success) return { ok: false as const, message: "Those theme settings are invalid." };
  const theme = await updateThemeForUser({ ...parsed.data, userId: session.user.id });
  if (!theme) return { ok: false as const, message: "Only your custom themes can be edited." };
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteThemeAction(input: unknown) {
  const session = await getAllowedSession();
  const parsed = themePreferenceInputSchema.safeParse(input);
  if (!session || !parsed.success) return { ok: false as const, message: "That theme could not be deleted." };
  const deleted = await deleteThemeForUser(parsed.data.themeId, session.user.id);
  if (!deleted) return { ok: false as const, message: "Only your custom themes can be deleted." };
  revalidatePath("/");
  return { ok: true as const };
}

export async function setDefaultThemeAction(input: unknown) {
  const session = await getAllowedSession();
  const parsed = themePreferenceInputSchema.safeParse(input);
  if (!session || !parsed.success) return { ok: false as const, message: "That default could not be saved." };
  const updated = await setDefaultThemeForUser(parsed.data.themeId, session.user.id);
  if (!updated) return { ok: false as const, message: "That theme was not found." };
  revalidatePath("/");
  return { ok: true as const };
}

export async function toggleFavoriteThemeAction(input: unknown) {
  const session = await getAllowedSession();
  const parsed = themePreferenceInputSchema.safeParse(input);
  if (!session || !parsed.success) return { ok: false as const, message: "That favourite could not be saved." };
  const isFavorite = await toggleFavoriteThemeForUser(parsed.data.themeId, session.user.id);
  return isFavorite === null
    ? { ok: false as const, message: "That theme was not found." }
    : { ok: true as const, isFavorite };
}
