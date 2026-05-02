import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}

export const SectionCard = ({ title, action, children }: SectionCardProps) => (
  <Card>
    <CardContent>
      {(title || action) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">{title}</Typography>
          {action}
        </Stack>
      )}
      {children}
    </CardContent>
  </Card>
);
