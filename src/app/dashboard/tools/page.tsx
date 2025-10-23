'use client';

import React from 'react';
import { Grid, Card, CardContent, CardActions, Button, Box, Typography } from '@mui/material';
import { Build as ToolsIcon, Language as WebIcon, AccountTree as WorkflowIcon } from '@mui/icons-material';
import Link from 'next/link';
import { StandardPageLayout } from '@/components/dashboard/StandardPageLayout';

export default function ToolsPage() {
  const tools = [
    {
      id: 1,
      title: 'Web Scraping',
      description: 'Extract data from any website with AI-powered scraping capabilities',
      icon: <WebIcon sx={{ fontSize: '3rem', color: 'primary.main' }} />,
      status: 'Available',
      action: 'Launch Tool',
      link: '/dashboard/web-scraping'
    },
    {
      id: 2,
      title: 'Workflow Editor',
      description: 'Visual workflow automation builder for streamlining your business processes',
      icon: <WorkflowIcon sx={{ fontSize: '3rem', color: 'primary.main' }} />,
      status: 'Available',
      action: 'Launch Tool',
      link: '/dashboard/workflow'
    }
  ];

  return (
    <StandardPageLayout
      title="Tools Dashboard"
      description="Access your available tools and utilities to streamline your workflow"
      icon={<ToolsIcon />}
    >
      {/* Tools Grid */}
      <Grid container spacing={3} sx={{ p: { xs: 2, sm: 3 } }}>
        {tools.map((tool) => (
          <Grid item xs={12} sm={6} md={4} key={tool.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 3 }}>
                  {tool.icon}
                </Box>
                <Typography variant="h6" component="h2" fontWeight="600" sx={{ mb: 2 }}>
                  {tool.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tool.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                <Link href={tool.link} style={{ textDecoration: 'none' }}>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      px: 4,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    {tool.action}
                  </Button>
                </Link>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </StandardPageLayout>
  );
}