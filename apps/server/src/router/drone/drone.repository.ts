const activeStreams = new Map<string, ReturnType<typeof Bun.spawn>>();

export const droneRepository = {
  hasActiveStream: (droneId: string) => activeStreams.has(droneId),
  getActiveStream: (droneId: string) => activeStreams.get(droneId),
  setActiveStream: (droneId: string, process: ReturnType<typeof Bun.spawn>) =>
    activeStreams.set(droneId, process),
  removeActiveStream: (droneId: string) => activeStreams.delete(droneId),
  cleanupActiveStreams: () => {
    for (const process of activeStreams.values()) {
      process.kill();
    }

    activeStreams.clear();
  },
};
