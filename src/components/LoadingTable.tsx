import { Skeleton, Stack } from '@mui/material';

export const LoadingTable = () => (
  <Stack spacing={1.5}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Skeleton key={index} variant="rounded" height={52} />
    ))}
  </Stack>
);
