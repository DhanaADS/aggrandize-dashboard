# Processing Queue

Track publication/task processing status for orders.

## Instructions

### Views Available
Ask user what they want:
- **My tasks** - Tasks assigned to current user
- **All pending** - All unfinished tasks
- **By order** - Tasks for specific order
- **Overdue** - Past due date tasks

### Task Status Report Format
```
PROCESSING QUEUE
================
| Order # | Client    | Keyword        | Publication | Status      | Due Date |
|---------|-----------|----------------|-------------|-------------|----------|
| ORD-001 | Client A  | SEO Services   | site.com    | In Progress | Dec 25   |
| ORD-002 | Client B  | Web Design     | blog.net    | Published   | Dec 20   |

SUMMARY
-------
Total Tasks: XX
- Not Started: X
- In Progress: X
- Content Writing: X
- Pending Approval: X
- Approved: X
- Publishing: X
- Published: X
Overdue: X
```

### Task Status Workflow
```
not_started -> in_progress -> content_writing -> pending_approval
                                                      |
                                          +-----------+-----------+
                                          |                       |
                                       approved               rejected
                                          |                   (feedback)
                                          v                       |
                                      publishing                  |
                                          |                       |
                                          v                       |
                                      published <-----------------+
                                          |
                                          v
                                      completed
```

### Data Sources
- `order_items` table (tasks)
- `orders` table (order info, assigned_to)
- API: `/api/processing`

### API Usage

#### GET - List my tasks
```
GET /api/processing
```

#### POST - Update task status
```
POST /api/processing/[itemId]/update-status
{
  "processing_status": "in_progress"
}
```

#### POST - Submit content
```
POST /api/processing/[itemId]/submit-content
{
  "content_url": "https://docs.google.com/...",
  "content_notes": "Article ready for review"
}
```

#### POST - Submit live URL
```
POST /api/processing/[itemId]/submit-live
{
  "live_url": "https://example.com/article"
}
```

### SQL Queries
```sql
-- My assigned tasks
SELECT oi.*, o.order_number, o.client_name, o.due_date
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.assigned_to = $1
  AND o.status != 'cancelled'
  AND oi.status != 'live'
ORDER BY o.due_date ASC;

-- Overdue tasks
SELECT oi.*, o.order_number, o.client_name, o.due_date
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.due_date < CURRENT_DATE
  AND oi.status != 'live'
ORDER BY o.due_date ASC;

-- Tasks by order
SELECT * FROM order_items WHERE order_id = $1;
```
