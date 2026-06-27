"use client";

import { createContext, useContext, type ReactNode } from "react";

import { toPlatformWorkspacePath } from "@/lib/paths/workspace";
import type { PlatformWorkspaceContextValue } from "@/types/platform-workspace";

const PlatformWorkspaceContext = createContext<PlatformWorkspaceContextValue>({
  active: false,
  session: null,
  adminDisplayName: "",
  businessPermissions: [],
});

export function PlatformWorkspaceProvider({
  value,
  children,
}: {
  value: PlatformWorkspaceContextValue;
  children: ReactNode;
}) {
  return (
    <PlatformWorkspaceContext.Provider value={value}>
      {children}
    </PlatformWorkspaceContext.Provider>
  );
}

export function usePlatformWorkspace(): PlatformWorkspaceContextValue {
  return useContext(PlatformWorkspaceContext);
}

export function useWorkspaceAwarePath(slug: string, companyPath: string): string {
  const workspace = usePlatformWorkspace();
  if (!workspace.active) return companyPath;
  return toPlatformWorkspacePath(slug, companyPath);
}
