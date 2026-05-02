import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <Box display="flex" justifyContent="center" alignItems="center" py={8}>
    <Stack spacing={2} alignItems="center" textAlign="center">
      <SearchOffRoundedIcon color="disabled" sx={{ fontSize: 54 }} />
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {action}
    </Stack>
  </Box>
);

export const EmptyStateResetButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <Button variant="outlined" onClick={onClick}>
    {label}
  </Button>
);
