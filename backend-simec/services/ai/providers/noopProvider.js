export const NoopProvider = {
  name: 'heuristic',

  isAvailable() {
    return false;
  },

  getModel() {
    return null;
  },

  async generateText() {
    throw new Error('LLM_PROVIDER_UNAVAILABLE');
  },
};
