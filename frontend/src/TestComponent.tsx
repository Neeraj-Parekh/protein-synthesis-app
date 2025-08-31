import React from 'react'
import { Container, Typography, Paper, Box } from '@mui/material'

const TestComponent: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          🧬 Test Component Working
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            If you can see this, React and Material-UI are working correctly.
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}

export default TestComponent
