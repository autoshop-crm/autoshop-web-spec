export const resolveLoginErrorMessage = (error: any) => {
  const status = error?.response?.status;
  const requestUrl = String(error?.config?.url ?? '');
  const backendMessage = error?.response?.data?.message;

  if (status === 401) {
    return backendMessage ?? 'Неверный логин или пароль.';
  }

  if (status === 404 && requestUrl.includes('/api/auth/login')) {
    return 'Dev proxy не активен: запрос /api/auth/login вернул 404. Перезапустите Vite и откройте UI строго через http://localhost:5173/.';
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'Gateway доступен, но backend недоступен или ещё не прогрелся.';
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Нет соединения с dev proxy или backend gateway. Проверьте Vite и backend-контур.';
  }

  return backendMessage ?? 'Не удалось выполнить вход. Проверьте dev proxy, доступность gateway и корректность учётных данных.';
};
