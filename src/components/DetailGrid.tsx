import { Grid, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export interface DetailItem {
  label: string;
  value: ReactNode;
}

export const DetailGrid = ({ items }: { items: DetailItem[] }) => (
  <Grid container spacing={3}>
    {items.map((item) => (
      <Grid size={{ xs: 12, md: 6 }} key={item.label}>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            {item.label}
          </Typography>
          <Typography variant="body1">{item.value || '—'}</Typography>
        </Stack>
      </Grid>
    ))}
  </Grid>
);
