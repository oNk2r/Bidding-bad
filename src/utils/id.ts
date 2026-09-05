export function generateCustomId(prefix: string, ...args: (string | number)[]): string {
  return [prefix, ...args].join(":");
}

export function parseCustomId(customId: string): { prefix: string; args: string[] } {
  const parts = customId.split(":");
  return {
    prefix: parts[0],
    args: parts.slice(1),
  };
}
