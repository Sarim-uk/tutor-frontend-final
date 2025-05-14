import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import axios from 'axios';

// Emotion colors
const EMOTION_COLORS = {
  Happy: '#4CAF50',
  Sad: '#5C6BC0',
  Angry: '#F44336',
  Fearful: '#FF9800',
  Disgusted: '#795548',
  Surprised: '#9C27B0',
  Neutral: '#9E9E9E'
};

// COLORS array for charts
const COLORS = Object.values(EMOTION_COLORS);

const EmotionAnalyticsDashboard = ({ sessionId }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get token from localStorage
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        const response = await axios.get(
          `http://localhost:8000/vidchat/emotion-analytics/${sessionId}/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        setAnalyticsData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching emotion analytics:', err);
        setError(err.response?.data?.error || 'Failed to load emotion analytics data');
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [sessionId]);

  // Format data for pie chart
  const formatPieChartData = (emotionCounts) => {
    if (!emotionCounts) return [];
    
    return Object.entries(emotionCounts).map(([emotion, count]) => ({
      name: emotion,
      value: count
    }));
  };

  // Format data for line chart
  const formatLineChartData = (emotionsOverTime) => {
    if (!emotionsOverTime) return [];
    
    // Create a numeric value for each emotion for the line chart
    const emotionValues = {
      'Happy': 6,
      'Surprised': 5,
      'Neutral': 4,
      'Fearful': 3,
      'Sad': 2,
      'Disgusted': 1,
      'Angry': 0
    };
    
    return emotionsOverTime.map(item => ({
      ...item,
      emotionValue: emotionValues[item.emotion] || 3,
      time: item.timestamp
    }));
  };

  // Custom tooltip for line chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1, bgcolor: 'background.paper' }}>
          <Typography variant="body2">{`Time: ${data.time}`}</Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: EMOTION_COLORS[data.emotion] || 'text.primary',
              fontWeight: 'bold'
            }}
          >
            {`Emotion: ${data.emotion}`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analyticsData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No emotion analytics data available for this session.
      </Alert>
    );
  }

  const pieChartData = formatPieChartData(analyticsData.emotion_counts);
  const lineChartData = formatLineChartData(analyticsData.emotions_over_time);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Emotion Analytics: Session with {analyticsData.student_name}
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Session Duration: {analyticsData.duration} • Records: {analyticsData.total_records}
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Engagement Score */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Engagement Score" />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  mb: 2
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={analyticsData.engagement_score}
                  size={120}
                  thickness={5}
                  sx={{
                    color: analyticsData.engagement_score >= 80 
                      ? 'success.main' 
                      : analyticsData.engagement_score >= 60 
                        ? 'warning.main' 
                        : 'error.main'
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ fontWeight: 'bold' }}
                  >
                    {`${analyticsData.engagement_score}%`}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" align="center">
                {analyticsData.engagement_score >= 80 
                  ? 'Highly Engaged' 
                  : analyticsData.engagement_score >= 60 
                    ? 'Moderately Engaged' 
                    : 'Low Engagement'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Emotion Distribution */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Emotion Distribution" />
            <CardContent>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={EMOTION_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} occurrences`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Emotions Over Time */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Emotions Over Time" />
            <CardContent>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineChartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis 
                      domain={[0, 6]} 
                      ticks={[0, 1, 2, 3, 4, 5, 6]} 
                      tickFormatter={(value) => {
                        const emotions = ['Angry', 'Disgusted', 'Sad', 'Fearful', 'Neutral', 'Surprised', 'Happy'];
                        return emotions[value] || '';
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="emotionValue" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      dot={{ 
                        stroke: 'none',
                        fill: ({ emotion }) => EMOTION_COLORS[emotion] || '#8884d8'
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Insights */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="AI Insights" />
            <CardContent>
              <List>
                {analyticsData.insights.map((insight, index) => (
                  <ListItem key={index} divider={index < analyticsData.insights.length - 1}>
                    <ListItemText primary={insight} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmotionAnalyticsDashboard; 