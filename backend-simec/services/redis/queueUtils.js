export async function logQueueState(prefix, queue) {
  try {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );
    console.log(`[${prefix}]`, counts);
  } catch (error) {
    console.error(`[${prefix}] Erro ao inspecionar fila:`, error.message);
  }
}
