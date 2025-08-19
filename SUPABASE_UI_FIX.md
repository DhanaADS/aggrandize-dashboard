# 🚨 SUPABASE UI FIX - Manual Storage Configuration

## ❌ **SQL Error Received:**
```
ERROR: 42501: must be owner of table objects
```

This error is expected! Supabase doesn't allow direct SQL modification of storage tables. We need to use the Supabase Dashboard UI instead.

## 🎯 **SOLUTION - Use Supabase Dashboard UI:**

### **Step 1: Create/Configure Storage Bucket**
1. **Go to Supabase Dashboard** → **Storage**
2. **Click "Create a new bucket"** (or find existing "todo-attachments")
3. **Bucket name:** `todo-attachments`
4. **Make it Public:** ✅ **Check the "Public bucket" option**
5. **Click "Create bucket"**

### **Step 2: Configure Storage Policies**
1. **Go to Storage** → **Policies**
2. **Select the "todo-attachments" bucket**
3. **Delete any existing restrictive policies**
4. **Click "New Policy"**
5. **Add this policy:**
   ```
   Policy name: Allow all file operations
   Allowed operation: All
   Target roles: authenticated
   Using expression: true
   With check expression: true
   ```
6. **Click "Save"**

### **Step 3: Alternative - Use Pre-built Policy Templates**
If custom policies don't work:
1. **Go to Storage** → **Policies**
2. **Click "New Policy"**
3. **Choose template: "Allow logged-in users to upload"**
4. **Apply to bucket: todo-attachments**
5. **Save**

### **Step 4: Test File Upload**
1. **Refresh your application**
2. **Try uploading a file**
3. **Check browser console for detailed error messages**

## 🔧 **Alternative Solutions:**

### **Option A: Make Bucket Completely Public**
1. **Storage** → **Buckets** → **todo-attachments**
2. **Settings** → **Public bucket: ON**
3. **This bypasses all RLS issues**

### **Option B: Use Built-in Policy Templates**
Supabase provides templates that work well:
- "Give users access to own folder"
- "Allow logged-in users to upload"
- "Allow users to view files"

### **Option C: Check Authentication Context**
The RLS policies might be failing because NextAuth isn't properly setting the user context. Check:
1. **Go to Authentication** → **Users** in Supabase
2. **Make sure your user exists there**
3. **Check if JWT tokens are being passed correctly**

## 🎯 **Expected Result:**
After configuring through the UI:
- ✅ Storage bucket exists and is public/accessible
- ✅ Policies allow file uploads for authenticated users
- ✅ File uploads work without RLS violations
- ✅ No more StorageApiError messages

## 🆘 **If Still Failing:**
1. **Make the bucket completely public** (easiest solution)
2. **Check browser console** for exact error messages
3. **Verify your user is authenticated** in Supabase dashboard
4. **Try uploading a small text file first** to test basic functionality

---

**💡 Key Point: Storage configuration must be done through Supabase Dashboard UI, not SQL commands.**