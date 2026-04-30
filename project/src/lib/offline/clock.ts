export interface ClientTimestamp {
  clientCreatedAt: number;
  clientTzOffset: number;
  clientCreatedAtIso: string;
}

export function nowClient(): ClientTimestamp {
  const d = new Date();
  return {
    clientCreatedAt: d.getTime(),
    clientTzOffset: d.getTimezoneOffset(),
    clientCreatedAtIso: d.toISOString(),
  };
}
