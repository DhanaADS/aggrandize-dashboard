-- Migration: Enable Multiple Assignments per Order Item
-- Date: 2024-12-21
-- Purpose: Remove UNIQUE constraint on order_item_id to allow multiple team members per item

-- Step 1: Remove the UNIQUE constraint on order_item_id
-- (The constraint name follows PostgreSQL's naming convention: <table>_<column>_key)
ALTER TABLE order_item_assignments
DROP CONSTRAINT IF EXISTS order_item_assignments_order_item_id_key;

-- Step 2: Add composite unique constraint to prevent duplicate assignments
-- (Same person cannot be assigned twice to the same item)
ALTER TABLE order_item_assignments
ADD CONSTRAINT order_item_assignments_item_person_unique
UNIQUE (order_item_id, assigned_to);

-- Step 3: Update the comment to reflect new behavior
COMMENT ON TABLE order_item_assignments IS 'Tracks order item assignments from Marketing to Processing team. Multiple team members can be assigned to the same item.';

-- Verify the changes
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'order_item_assignments'::regclass;
