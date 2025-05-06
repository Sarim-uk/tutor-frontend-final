import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Avatar } from '@mui/material';
import { format } from 'date-fns';
import { scaleIn } from '../../utils/animations';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

function ProgressCard({ progress, index }) {
  const getProgressColor = (value) => {
    if (value >= 80) return 'success.main';
    if (value >= 60) return 'warning.main';
    return 'error.main';
  };

  return (
    <Card 
      sx={{ 
        mb: 2,
        animation: `${scaleIn} 0.5s ease-out forwards ${index * 0.1}s`,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: (theme) => theme.shadows[10],
        },
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          bgcolor: 'primary.main',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 3,
        }}
      >
        <TrendingUpIcon sx={{ color: 'white' }} />
      </Box>
      <CardContent>
        <Box display="flex" alignItems="center" mb={3}>
          <Avatar 
            src={progress.student_ids?.profile_picture_url}
            alt={`${progress.student_ids?.first_name || ''} ${progress.student_ids?.last_name || ''}`}
            sx={{ 
              width: 50, 
              height: 50,
              mr: 2,
              border: '2px solid',
              borderColor: 'primary.main',
            }}
          />
          <Box>
            <Typography variant="h6" color="primary">
              {progress.student_ids?.first_name} {progress.student_ids?.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated: {format(new Date(progress.created_at), 'PPP')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">Attendance</Typography>
            <Typography variant="body2" color={getProgressColor(progress.attendance)}>
              {progress.attendance}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress.attendance}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: getProgressColor(progress.attendance),
                borderRadius: 4,
              }
            }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">Performance</Typography>
            <Typography variant="body2" color={getProgressColor(progress.peformance)}>
              {progress.peformance}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress.peformance}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: getProgressColor(progress.peformance),
                borderRadius: 4,
              }
            }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">Concentration</Typography>
            <Typography variant="body2" color={getProgressColor(progress.concentration)}>
              {progress.concentration}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress.concentration}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: getProgressColor(progress.concentration),
                borderRadius: 4,
              }
            }}
          />
        </Box>

        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            mt: 2,
            p: 1.5,
            bgcolor: 'grey.50',
            borderRadius: 1,
            fontStyle: 'italic'
          }}
        >
          "{progress.comments}"
        </Typography>
      </CardContent>
    </Card>
  );
}

export default ProgressCard; 