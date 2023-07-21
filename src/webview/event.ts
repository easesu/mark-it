
export const emit = (eventType: string, payload?: any) => {
  const event = new CustomEvent(eventType, {
    detail: {
      ...payload,
    }
  });
  document.dispatchEvent(event);
};

export const on = (eventType: string, handler: Function) => {
  if (!handler || (handler as unknown as any).__innerHandler__) {
    return;
  }
  const innerHandler = (e: any) => {
    handler(e.detail);
  };
  (handler as unknown as any).__innerHandler__ = innerHandler;

  document.addEventListener(eventType, innerHandler);
};

export const off = (eventType: string, handler: Function) => {
  if (!handler || !(handler as unknown as any).__innerHandler__) {
    return;
  }

  document.removeEventListener(eventType, (handler as unknown as any).__innerHandler__);
};