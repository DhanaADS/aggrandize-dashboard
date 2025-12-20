'use client';

import { useState, useEffect } from 'react';
import { StandardPageLayout } from '@/components/dashboard/StandardPageLayout';
import {
  Api as ApiIcon,
  Storage as StorageIcon,
  History as HistoryIcon,
  PlayArrow as PlayIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  TableChart as TableIcon,
  MenuBook as DocsIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Environment variables
const API_URL = process.env.NEXT_PUBLIC_UMBREL_API_URL || 'https://api.aggrandizedigital.com';
const API_KEY = process.env.NEXT_PUBLIC_UMBREL_API_KEY || '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_UMBREL_ADMIN_KEY || '';

interface TableInfo {
  table_name: string;
  table_type: string;
  column_count: number;
  size: string;
  estimated_rows: string;
  protected: boolean;
}

interface Migration {
  id: number;
  name: string;
  sql_content: string;
  executed_at: string;
  executed_by: string;
  status: string;
  error_message: string | null;
}

interface AuditLog {
  id: number;
  action: string;
  table_name: string | null;
  sql_executed: string | null;
  executed_by: string;
  ip_address: string;
  executed_at: string;
  success: boolean;
  error_message: string | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ApiManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SQL Query state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM orders LIMIT 10');
  const [queryResult, setQueryResult] = useState<unknown[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Create table dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableColumns, setNewTableColumns] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = {
        'X-API-Key': API_KEY,
        'X-ADMIN-KEY': ADMIN_KEY,
        'Content-Type': 'application/json',
      };

      // Fetch tables
      const tablesRes = await fetch(`${API_URL}/migrate/tables`, { headers });
      if (tablesRes.ok) {
        const data = await tablesRes.json();
        setTables(data.data || []);
      }

      // Fetch migrations
      const migrationsRes = await fetch(`${API_URL}/migrate`, { headers });
      if (migrationsRes.ok) {
        const data = await migrationsRes.json();
        setMigrations(data.data || []);
      }

      // Fetch audit logs
      const auditRes = await fetch(`${API_URL}/migrate/audit?limit=50`, { headers });
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExecuteQuery = async () => {
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const response = await fetch(`${API_URL}/migrate/query`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'X-ADMIN-KEY': ADMIN_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: sqlQuery }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details?.join(', ') || 'Query failed');
      }

      setQueryResult(data.data);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCreateTable = async () => {
    setCreateLoading(true);
    setCreateError(null);

    try {
      // Parse columns from simple format: name:type, name:type
      const columns = newTableColumns.split(',').map(col => {
        const [name, typeWithFlags] = col.trim().split(':');
        const type = typeWithFlags?.trim() || 'VARCHAR(255)';
        const isPrimary = type.toLowerCase().includes('primary');
        const isUnique = type.toLowerCase().includes('unique');
        const cleanType = type.replace(/primary/gi, '').replace(/unique/gi, '').trim();

        return {
          name: name.trim(),
          type: cleanType || 'VARCHAR(255)',
          primary: isPrimary,
          unique: isUnique,
        };
      });

      const response = await fetch(`${API_URL}/migrate/create-table`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'X-ADMIN-KEY': ADMIN_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_name: newTableName,
          columns,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create table');
      }

      setCreateDialogOpen(false);
      setNewTableName('');
      setNewTableColumns('');
      fetchData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create table');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDropTable = async (tableName: string) => {
    if (!confirm(`Are you sure you want to drop table "${tableName}"? This cannot be undone!`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/migrate/table/${tableName}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': API_KEY,
          'X-ADMIN-KEY': ADMIN_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to drop table');
      }

      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to drop table');
    }
  };

  if (loading) {
    return (
      <StandardPageLayout
        title="API Management"
        description="Manage database schema and execute queries"
        icon={<ApiIcon />}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 2 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">
            Loading API data...
          </Typography>
        </Box>
      </StandardPageLayout>
    );
  }

  return (
    <StandardPageLayout
      title="API Management"
      description="Manage database schema and execute queries"
      icon={<ApiIcon />}
      headerAction={
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
        >
          Refresh
        </Button>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<TableIcon />} label="Tables" />
          <Tab icon={<PlayIcon />} label="SQL Query" />
          <Tab icon={<HistoryIcon />} label="Migrations" />
          <Tab icon={<StorageIcon />} label="Audit Log" />
          <Tab icon={<DocsIcon />} label="API Docs" />
        </Tabs>
      </Box>

      {/* Tables Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Database Tables ({tables.length})</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Table
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Table Name</TableCell>
                <TableCell>Columns</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Est. Rows</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.table_name}>
                  <TableCell>
                    <Typography fontWeight="bold">{table.table_name}</Typography>
                  </TableCell>
                  <TableCell>{table.column_count}</TableCell>
                  <TableCell>{table.size}</TableCell>
                  <TableCell>{table.estimated_rows}</TableCell>
                  <TableCell>
                    {table.protected ? (
                      <Chip label="Protected" color="warning" size="small" />
                    ) : (
                      <Chip label="Normal" color="success" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={table.protected ? 'Protected table cannot be deleted' : 'Delete table'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={table.protected}
                          onClick={() => handleDropTable(table.table_name)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* SQL Query Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>Execute SQL Query</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Only SELECT queries are allowed in this interface. For DDL operations, use the Migrations tab.
        </Alert>

        <TextField
          fullWidth
          multiline
          rows={4}
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          placeholder="SELECT * FROM your_table LIMIT 10"
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          startIcon={queryLoading ? <CircularProgress size={20} /> : <PlayIcon />}
          onClick={handleExecuteQuery}
          disabled={queryLoading || !sqlQuery.trim()}
        >
          Execute Query
        </Button>

        {queryError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {queryError}
          </Alert>
        )}

        {queryResult && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Results ({queryResult.length} rows)
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {queryResult.length > 0 && Object.keys(queryResult[0] as object).map((key) => (
                      <TableCell key={key}>{key}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queryResult.map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.values(row as object).map((val, i) => (
                        <TableCell key={i}>
                          {val === null ? <em>null</em> : String(val)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </TabPanel>

      {/* Migrations Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>Migration History ({migrations.length})</Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Executed At</TableCell>
                <TableCell>Executed By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {migrations.map((migration) => (
                <TableRow key={migration.id}>
                  <TableCell>{migration.id}</TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">{migration.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {migration.sql_content?.substring(0, 50)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={migration.status}
                      color={migration.status === 'success' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(migration.executed_at).toLocaleString()}</TableCell>
                  <TableCell>{migration.executed_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Audit Log Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>Audit Log ({auditLogs.length})</Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell>Table</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Executed At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Typography fontWeight="bold">{log.action}</Typography>
                  </TableCell>
                  <TableCell>{log.table_name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.success ? 'Success' : 'Failed'}
                      color={log.success ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.ip_address}</TableCell>
                  <TableCell>{new Date(log.executed_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* API Documentation Tab */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h6" gutterBottom>API Documentation</Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Base URL: <strong>{API_URL}</strong> | All endpoints require <code>X-API-Key</code> header. Migration endpoints also require <code>X-ADMIN-KEY</code> header.
        </Alert>

        {/* Connection Modes Section */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">🔌 Connection Modes</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              The application supports two database connection modes:
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Mode</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Chip label="direct" size="small" color="success" /></TableCell>
                    <TableCell>Local Development</TableCell>
                    <TableCell>Direct PostgreSQL connection to umbrel.local:5432</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="api" size="small" color="primary" /></TableCell>
                    <TableCell>Vercel / Remote</TableCell>
                    <TableCell>HTTP API via Cloudflare (api.aggrandizedigital.com)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Environment Variables:</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`# For Vercel / Remote deployment:
UMBREL_CONNECTION_MODE=api
UMBREL_API_URL=https://api.aggrandizedigital.com
UMBREL_API_KEY=your-api-key
UMBREL_ADMIN_KEY=your-admin-key

# For Local Development (optional, defaults to direct):
UMBREL_CONNECTION_MODE=direct`}
              </code>
            </Paper>
            <Alert severity="warning">
              <strong>Important:</strong> When setting environment variables on Vercel, ensure there are no trailing newlines or spaces in the values.
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Troubleshooting Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">🔧 Troubleshooting</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Common Errors:</Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Error</TableCell>
                    <TableCell>Cause</TableCell>
                    <TableCell>Solution</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><code>getaddrinfo ENOTFOUND umbrel.local</code></TableCell>
                    <TableCell>App trying direct PostgreSQL but can&apos;t reach Umbrel</TableCell>
                    <TableCell>Set <code>UMBREL_CONNECTION_MODE=api</code> on Vercel</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>401 Unauthorized</code></TableCell>
                    <TableCell>Missing or invalid API key</TableCell>
                    <TableCell>Check <code>X-API-Key</code> header value</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>403 Forbidden</code></TableCell>
                    <TableCell>Missing admin key for protected endpoints</TableCell>
                    <TableCell>Add <code>X-ADMIN-KEY</code> header for /migrate/* and /query endpoints</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>UMBREL_API_KEY is required</code></TableCell>
                    <TableCell>API mode enabled but no key configured</TableCell>
                    <TableCell>Add <code>UMBREL_API_KEY</code> environment variable</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>Query request timeout</code></TableCell>
                    <TableCell>API request took too long (30s timeout)</TableCell>
                    <TableCell>Check Umbrel server status, simplify query</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Quick Checks:</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900' }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`# 1. Test API connectivity:
curl -X GET "${API_URL}/health" -H "X-API-Key: YOUR_KEY"

# 2. Test database query:
curl -X POST "${API_URL}/query" \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"sql": "SELECT NOW()"}'

# 3. List tables:
curl -X GET "${API_URL}/migrate/tables" \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY"`}
              </code>
            </Paper>
          </AccordionDetails>
        </Accordion>

        {/* Authentication Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">🔐 Authentication</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              All API requests require authentication headers:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`Headers:
  X-API-Key: your-api-key
  X-ADMIN-KEY: your-admin-key  (required for /migrate/* endpoints)
  Content-Type: application/json`}
              </code>
            </Paper>
            <Alert severity="warning" sx={{ mt: 1 }}>
              Keep your API keys secure. Never expose them in client-side code or public repositories.
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Health Check */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="GET" size="small" color="success" />
              <Typography variant="subtitle1" fontWeight="bold">/health</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Check API and database connection status.</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X GET "${API_URL}/health" \\
  -H "X-API-Key: YOUR_API_KEY"

Response:
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0"
}`}
              </code>
            </Paper>
          </AccordionDetails>
        </Accordion>

        {/* Generic Query Endpoint */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="POST" size="small" color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">/query</Typography>
              <Chip label="NEW" size="small" color="secondary" sx={{ ml: 1 }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              Execute any SQL query with parameterized values. This is the primary endpoint for database operations from the dashboard.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X POST "${API_URL}/query" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sql": "SELECT * FROM website_inventory WHERE status = $1 LIMIT $2",
    "params": ["active", 10]
  }'

Response:
{
  "success": true,
  "rows": [...],
  "rowCount": 10,
  "duration_ms": 45
}`}
              </code>
            </Paper>
            <Alert severity="info" sx={{ mb: 2 }}>
              Use parameterized queries ($1, $2, etc.) to prevent SQL injection. The params array values are substituted in order.
            </Alert>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Request Body:</Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Field</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell>sql</TableCell><TableCell>string</TableCell><TableCell>SQL query with $1, $2 placeholders (required)</TableCell></TableRow>
                  <TableRow><TableCell>params</TableCell><TableCell>array</TableCell><TableCell>Parameter values in order (optional, default: [])</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Alert severity="warning">
              Requires both X-API-Key and X-ADMIN-KEY headers. All queries are logged for audit purposes.
            </Alert>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Migration Endpoints</Typography>

        {/* List Tables */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="GET" size="small" color="success" />
              <Typography variant="subtitle1" fontWeight="bold">/migrate/tables</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>List all database tables with schema information.</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X GET "${API_URL}/migrate/tables" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY"

Response:
{
  "success": true,
  "count": 10,
  "data": [
    {
      "table_name": "orders",
      "table_type": "BASE TABLE",
      "column_count": 12,
      "size": "48 kB",
      "estimated_rows": "150",
      "protected": false
    }
  ]
}`}
              </code>
            </Paper>
          </AccordionDetails>
        </Accordion>

        {/* Get Table Structure */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="GET" size="small" color="success" />
              <Typography variant="subtitle1" fontWeight="bold">/migrate/table/:name</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Get detailed table structure including columns, indexes, and foreign keys.</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X GET "${API_URL}/migrate/table/orders" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY"

Response:
{
  "success": true,
  "data": {
    "table_name": "orders",
    "protected": false,
    "columns": [
      { "column_name": "id", "data_type": "integer", "is_nullable": "NO" },
      { "column_name": "client_name", "data_type": "varchar", "is_nullable": "YES" }
    ],
    "indexes": [...],
    "foreign_keys": [...]
  }
}`}
              </code>
            </Paper>
          </AccordionDetails>
        </Accordion>

        {/* Create Table */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="POST" size="small" color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">/migrate/create-table</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Create a new table from JSON schema definition.</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X POST "${API_URL}/migrate/create-table" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table_name": "customers",
    "columns": [
      { "name": "id", "type": "SERIAL", "primary": true },
      { "name": "name", "type": "VARCHAR(255)", "nullable": false },
      { "name": "email", "type": "VARCHAR(255)", "unique": true },
      { "name": "created_at", "type": "TIMESTAMP", "default": "NOW()" }
    ],
    "indexes": [
      { "columns": ["email"], "unique": true }
    ]
  }'

Response:
{
  "success": true,
  "message": "Table 'customers' created successfully",
  "table_name": "customers",
  "columns": 4,
  "indexes": ["idx_customers_email"]
}`}
              </code>
            </Paper>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Column Options:</Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Property</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell>name</TableCell><TableCell>string</TableCell><TableCell>Column name (required)</TableCell></TableRow>
                  <TableRow><TableCell>type</TableCell><TableCell>string</TableCell><TableCell>PostgreSQL data type (required)</TableCell></TableRow>
                  <TableRow><TableCell>primary</TableCell><TableCell>boolean</TableCell><TableCell>Set as primary key</TableCell></TableRow>
                  <TableRow><TableCell>unique</TableCell><TableCell>boolean</TableCell><TableCell>Add unique constraint</TableCell></TableRow>
                  <TableRow><TableCell>nullable</TableCell><TableCell>boolean</TableCell><TableCell>Allow NULL values (default: true)</TableCell></TableRow>
                  <TableRow><TableCell>default</TableCell><TableCell>string</TableCell><TableCell>Default value expression</TableCell></TableRow>
                  <TableRow><TableCell>references</TableCell><TableCell>string</TableCell><TableCell>Foreign key reference (e.g., "users(id)")</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Execute Query */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="POST" size="small" color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">/migrate/query</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Execute a SELECT query (read-only).</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X POST "${API_URL}/migrate/query" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sql": "SELECT * FROM orders LIMIT 10"
  }'

Response:
{
  "success": true,
  "rowCount": 10,
  "data": [...]
}`}
              </code>
            </Paper>
            <Alert severity="info">Only SELECT queries are allowed. For DDL operations, use /migrate/run.</Alert>
          </AccordionDetails>
        </Accordion>

        {/* Run Migration */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="POST" size="small" color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">/migrate/run</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Execute a migration SQL statement (DDL operations).</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X POST "${API_URL}/migrate/run" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "add_status_column_to_orders",
    "sql": "ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending'",
    "rollback_sql": "ALTER TABLE orders DROP COLUMN status"
  }'

Response:
{
  "success": true,
  "message": "Migration 'add_status_column_to_orders' executed successfully",
  "duration_ms": 45,
  "migration": { "id": 5, "name": "add_status_column_to_orders", ... }
}`}
              </code>
            </Paper>
            <Alert severity="warning">Destructive operations (DROP, TRUNCATE) require <code>"confirm": true</code> in the request body.</Alert>
          </AccordionDetails>
        </Accordion>

        {/* Drop Table */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="DELETE" size="small" color="error" />
              <Typography variant="subtitle1" fontWeight="bold">/migrate/table/:name</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Drop a table (requires confirmation).</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X DELETE "${API_URL}/migrate/table/customers" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "confirm": true }'

Response:
{
  "success": true,
  "message": "Table 'customers' dropped successfully"
}`}
              </code>
            </Paper>
            <Alert severity="error">This action is irreversible! Protected tables cannot be dropped.</Alert>
          </AccordionDetails>
        </Accordion>

        {/* Migrations List */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="GET" size="small" color="success" />
              <Typography variant="subtitle1" fontWeight="bold">/migrate</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>List all executed migrations.</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X GET "${API_URL}/migrate" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY"

Response:
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "create_orders_table",
      "sql_content": "CREATE TABLE orders ...",
      "executed_at": "2024-01-15T10:30:00Z",
      "executed_by": "admin",
      "status": "success"
    }
  ]
}`}
              </code>
            </Paper>
          </AccordionDetails>
        </Accordion>

        {/* Audit Log */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="GET" size="small" color="success" />
              <Typography variant="subtitle1" fontWeight="bold">/migrate/audit</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Get audit log of all migration operations.</Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
              <code style={{ color: '#00ff88', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
{`curl -X GET "${API_URL}/migrate/audit?limit=50" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-ADMIN-KEY: YOUR_ADMIN_KEY"

Response:
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 1,
      "action": "CREATE_TABLE",
      "table_name": "customers",
      "executed_by": "admin",
      "ip_address": "192.168.1.100",
      "executed_at": "2024-01-15T10:30:00Z",
      "success": true
    }
  ]
}`}
              </code>
            </Paper>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Data Endpoints</Typography>

        {/* Orders */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="CRUD" size="small" color="secondary" />
              <Typography variant="subtitle1" fontWeight="bold">/orders</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Order management endpoints.</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Method</TableCell>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/orders</TableCell><TableCell>List all orders</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/orders/:id</TableCell><TableCell>Get order by ID</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/orders/stats</TableCell><TableCell>Get order statistics</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="POST" size="small" color="primary" /></TableCell><TableCell>/orders</TableCell><TableCell>Create new order</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="PUT" size="small" color="warning" /></TableCell><TableCell>/orders/:id</TableCell><TableCell>Update order</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="DELETE" size="small" color="error" /></TableCell><TableCell>/orders/:id</TableCell><TableCell>Delete order</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/orders/:id/items</TableCell><TableCell>Get order items</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="POST" size="small" color="primary" /></TableCell><TableCell>/orders/:id/items</TableCell><TableCell>Add order item</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/orders/:id/payments</TableCell><TableCell>Get order payments</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="POST" size="small" color="primary" /></TableCell><TableCell>/orders/:id/payments</TableCell><TableCell>Add payment</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Inventory */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="CRUD" size="small" color="secondary" />
              <Typography variant="subtitle1" fontWeight="bold">/inventory</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Inventory management endpoints.</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Method</TableCell>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/inventory</TableCell><TableCell>List all inventory items</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/inventory/:id</TableCell><TableCell>Get item by ID</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/inventory/meta/niches</TableCell><TableCell>Get available niches</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="POST" size="small" color="primary" /></TableCell><TableCell>/inventory</TableCell><TableCell>Create inventory item</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="PUT" size="small" color="warning" /></TableCell><TableCell>/inventory/:id</TableCell><TableCell>Update item</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="DELETE" size="small" color="error" /></TableCell><TableCell>/inventory/:id</TableCell><TableCell>Delete item</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Expenses */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="CRUD" size="small" color="secondary" />
              <Typography variant="subtitle1" fontWeight="bold">/expenses, /salaries, /utility-bills, /subscriptions, /settlements</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>Finance management endpoints - all follow standard CRUD pattern.</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Method</TableCell>
                    <TableCell>Endpoint Pattern</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/[resource]</TableCell><TableCell>List all records</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell>/[resource]/:id</TableCell><TableCell>Get by ID</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="POST" size="small" color="primary" /></TableCell><TableCell>/[resource]</TableCell><TableCell>Create record</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="PUT" size="small" color="warning" /></TableCell><TableCell>/[resource]/:id</TableCell><TableCell>Update record</TableCell></TableRow>
                  <TableRow><TableCell><Chip label="DELETE" size="small" color="error" /></TableCell><TableCell>/[resource]/:id</TableCell><TableCell>Delete record</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Error Codes */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Error Codes</Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Meaning</TableCell>
                <TableCell>Common Causes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell><Chip label="400" size="small" /></TableCell><TableCell>Bad Request</TableCell><TableCell>Invalid JSON, missing required fields, SQL validation failed</TableCell></TableRow>
              <TableRow><TableCell><Chip label="401" size="small" /></TableCell><TableCell>Unauthorized</TableCell><TableCell>Missing or invalid X-API-Key</TableCell></TableRow>
              <TableRow><TableCell><Chip label="403" size="small" /></TableCell><TableCell>Forbidden</TableCell><TableCell>Missing X-ADMIN-KEY for migration endpoints, protected table operation</TableCell></TableRow>
              <TableRow><TableCell><Chip label="404" size="small" /></TableCell><TableCell>Not Found</TableCell><TableCell>Resource or table does not exist</TableCell></TableRow>
              <TableRow><TableCell><Chip label="429" size="small" /></TableCell><TableCell>Too Many Requests</TableCell><TableCell>Rate limit exceeded (100 req/min)</TableCell></TableRow>
              <TableRow><TableCell><Chip label="500" size="small" /></TableCell><TableCell>Server Error</TableCell><TableCell>Database error, internal error</TableCell></TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Create Table Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Table</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Table Name"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="my_table"
            sx={{ mb: 2, mt: 1 }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Columns (format: name:type, name:type)"
            value={newTableColumns}
            onChange={(e) => setNewTableColumns(e.target.value)}
            placeholder="id:SERIAL PRIMARY, name:VARCHAR(255), email:VARCHAR(255) UNIQUE, created_at:TIMESTAMP"
            helperText="Example: id:SERIAL PRIMARY, name:VARCHAR(255), active:BOOLEAN"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateTable}
            disabled={createLoading || !newTableName.trim() || !newTableColumns.trim()}
          >
            {createLoading ? <CircularProgress size={20} /> : 'Create Table'}
          </Button>
        </DialogActions>
      </Dialog>
    </StandardPageLayout>
  );
}
