"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyMembership } from "@/lib/services/company-access";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/services/notifications";

export type NotificationActionResult = { ok: true } | { ok: false; error: string };

function revalidateNotificationPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/notifications`);
  revalidatePath(`/${slug}/dashboard`);
}

export async function markNotificationReadAction(input: {
  notificationId: string;
  companyId: string;
  companySlug: string;
}): Promise<NotificationActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await markNotificationRead(input.notificationId, input.companyId);
  if (!result.ok) return { ok: false, error: result.error ?? "Could not mark notification read." };
  revalidateNotificationPaths(input.companySlug);
  return { ok: true };
}

export async function markAllNotificationsReadAction(input: {
  companyId: string;
  companySlug: string;
}): Promise<NotificationActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await markAllNotificationsRead(input.companyId, access.userId);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not mark notifications read." };
  }
  revalidateNotificationPaths(input.companySlug);
  return { ok: true };
}
