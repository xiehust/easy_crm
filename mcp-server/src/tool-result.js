export function toolSuccess(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ok: true, data }, null, 2)
      }
    ]
  };
}

export function toolFailure(error) {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ok: false, error: error.message || 'Unknown error' }, null, 2)
      }
    ]
  };
}

export function withToolErrors(handler) {
  return async (input) => {
    try {
      return toolSuccess(await handler(input));
    } catch (error) {
      return toolFailure(error);
    }
  };
}
