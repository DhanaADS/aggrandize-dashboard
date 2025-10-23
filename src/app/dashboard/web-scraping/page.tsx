'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import {
  Save as SaveIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { StandardPageLayout } from '@/components/dashboard/StandardPageLayout';
import { ScrapingForm } from '@/components/web-scraping/ScrapingForm';

export default function WebScrapingPage() {
  return (
    <StandardPageLayout
      title="Web Scraping"
      description="Extract data from any website with powerful AI-powered scraping capabilities"
      icon={<LinkIcon />}
    >
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LinkIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography variant="h6" fontWeight="bold">
              ScrapeWise
            </Typography>
          </Box>

          <Button
            variant="contained"
            sx={{
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
              textTransform: 'none',
              px: 3,
              py: 1,
              fontWeight: 'bold'
            }}
          >
            Save Project
          </Button>
        </Box>

        {/* Main Form */}
        <Card elevation={0} sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          mb: 4
        }}>
          <CardContent sx={{ p: 4 }}>
            <ScrapingForm />
          </CardContent>
        </Card>
      </Box>
    </StandardPageLayout>
  );
}