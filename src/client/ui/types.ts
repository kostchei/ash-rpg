export type Act = <T>(event: string, payload?: unknown, success?: string) => Promise<T>;
