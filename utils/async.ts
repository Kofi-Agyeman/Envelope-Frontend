export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sleep(ms: number): Promise<void> {
  return delay(ms);
}
