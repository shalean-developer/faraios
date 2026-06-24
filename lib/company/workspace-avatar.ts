const GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-rose-500 to-orange-500",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
] as const;

export function workspaceAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]!;
}

export function workspaceInitial(label: string): string {
  const trimmed = label.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}
