import { Alert, AlertTitle, Button, Stack } from '@mui/material';

interface AppAlertProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export const AppAlert = ({ title = 'Ошибка', message, retryLabel = 'Повторить запрос', onRetry }: AppAlertProps) => (
  <Alert
    severity="error"
    action={
      onRetry ? (
        <Button color="inherit" size="small" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : undefined
    }
  >
    <AlertTitle>{title}</AlertTitle>
    {message}
  </Alert>
);
