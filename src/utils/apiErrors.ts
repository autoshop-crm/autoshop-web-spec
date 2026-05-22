export const getApiErrorMessage = (
  requestError: any,
  fallbackMessage: string,
  options?: {
    badRequest?: string;
    notFound?: string;
    conflict?: string;
  }
) => {
  const status = requestError?.response?.status;
  const backendMessage = requestError?.response?.data?.message;

  if (backendMessage) {
    return backendMessage;
  }

  if (status === 400) {
    return options?.badRequest ?? 'Запрос не прошёл проверку. Проверь введённые данные.';
  }

  if (status === 404) {
    return options?.notFound ?? 'Нужные данные не найдены или уже недоступны.';
  }

  if (status === 409) {
    return options?.conflict ?? 'Операция конфликтует с текущим состоянием данных. Обнови страницу и попробуй снова.';
  }

  return fallbackMessage;
};
