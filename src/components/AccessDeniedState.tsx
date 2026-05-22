import { EmptyState } from './EmptyState';

export const AccessDeniedState = ({ description = 'У вас нет прав для просмотра этого раздела.' }: { description?: string }) => (
  <EmptyState title="Нет доступа" description={description} action={null} />
);
