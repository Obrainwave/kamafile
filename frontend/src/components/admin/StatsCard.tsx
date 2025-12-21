import { Box, Paper, Typography } from '@mui/material'
import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: number | string
  icon: ReactNode
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'
}

export default function StatsCard({ title, value, icon, color = 'primary' }: StatsCardProps) {
  return (
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="h6" color="text.secondary" fontWeight="medium">
          {title}
        </Typography>
        <Box
          sx={{
            color: `${color}.main`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography variant="h3" component="div" fontWeight="bold" color={`${color}.main`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
    </Paper>
  )
}
