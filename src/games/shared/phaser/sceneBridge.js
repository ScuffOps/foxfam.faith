export function createSceneBridge({ onEvent, getState, getFamiliar, dispatchAction } = {}) {
  return {
    emit(type, payload = {}) {
      if (typeof onEvent === "function") {
        onEvent({ type, payload, createdAt: Date.now() });
      }
    },
    getState() {
      return typeof getState === "function" ? getState() : null;
    },
    getFamiliar() {
      return typeof getFamiliar === "function" ? getFamiliar() : null;
    },
    dispatch(action, payload = {}) {
      if (typeof dispatchAction === "function") {
        dispatchAction(action, payload);
      }
    },
  };
}
