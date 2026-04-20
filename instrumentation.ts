export async function register() {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  const { startTelegramPolling } = await import('@/lib/telegram/pollingService');
  await startTelegramPolling();
}
