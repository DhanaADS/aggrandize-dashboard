# Processing Hub

Central command for Processing team operations (Task management, Publications).

## Instructions

### Available Operations
- **My tasks** - View assigned tasks and due dates
- **Start task** - Mark task as in-progress
- **Submit content** - Upload article URL for approval
- **Request approval** - Send content for admin review
- **Submit live URL** - Record published article link
- **Task handoff** - Transfer task to another team member

### My Task Dashboard Format
```
MY PROCESSING QUEUE
===================
Assigned Tasks: XX
- Not Started: X
- In Progress: X
- Content Writing: X
- Pending Approval: X
- Ready to Publish: X
- Published: X

Overdue: X (WARNING!)

Today's Priority:
1. [ORD-XXX] [Keyword] - Due Today
2. [ORD-XXX] [Keyword] - Due Tomorrow
3. [ORD-XXX] [Keyword] - Due in 3 days

Recent Activity:
- Submitted content for ORD-XXX
- Published ORD-XXX to site.com
- Received feedback on ORD-XXX
```

### Workflow Status Updates
```
not_started     -> in_progress      (Start working)
in_progress     -> content_writing  (Writing article)
content_writing -> pending_approval (Submit for review)
pending_approval -> approved        (Admin approved)
                 -> rejected        (Needs revision - check feedback)
approved        -> publishing       (Sending to publication)
publishing      -> published        (Article is live)
published       -> completed        (All done)
```

### When Content is Rejected
If status is `content_writing` and there's `approval_feedback`, the content was rejected:
1. Read the feedback
2. Revise the content
3. Submit again for approval

### Data Sources
- `order_items` table (processing_status, content_url, live_url, approval_feedback)
- `orders` table (order_number, client_name, assigned_to, due_date)
- API: `/api/processing`

### API Usage

#### Get My Tasks
```
GET /api/processing
```

#### Update Status
```
PATCH /api/processing/[itemId]/update-status
{
  "processing_status": "in_progress"
}
```

#### Submit Content for Approval
```
POST /api/processing/[itemId]/submit-content
{
  "content_url": "https://docs.google.com/document/d/...",
  "content_notes": "Article ready for review"
}
```

#### Submit Live URL
```
POST /api/processing/[itemId]/submit-live
{
  "live_url": "https://example.com/published-article"
}
```

### SQL Queries
```sql
-- My assigned tasks (not completed)
SELECT
  oi.id,
  oi.keyword,
  oi.website,
  oi.processing_status,
  oi.content_url,
  oi.live_url,
  oi.approval_feedback,
  o.order_number,
  o.client_name,
  o.due_date
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.assigned_to = $1
  AND o.status != 'cancelled'
  AND oi.status != 'live'
ORDER BY o.due_date ASC;

-- Tasks with rejection feedback
SELECT * FROM order_items
WHERE processing_status = 'content_writing'
  AND approval_feedback IS NOT NULL;

-- Overdue tasks
SELECT oi.*, o.due_date, o.order_number
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.due_date < CURRENT_DATE
  AND oi.status != 'live';
```
