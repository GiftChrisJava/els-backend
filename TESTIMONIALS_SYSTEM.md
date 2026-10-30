# Testimonials System - Complete Process

**Responsible Role:** Web Admin (`WEB_ADMIN` or `SYSTEM_ADMIN`)
**Status Flow:** PENDING → APPROVED/REJECTED
**Public Submission:** Yes (anyone can submit)

---

## 👥 Who Can Do What?

### **Anyone (Public) Can:**
- ✅ Submit testimonials via `/api/v1/public/testimonials/submit`
- ✅ View approved testimonials
- ✅ View featured testimonials

### **Web Admin Can:**
- ✅ View all testimonials (pending, approved, rejected)
- ✅ Create testimonials directly (bypass approval)
- ✅ Approve pending testimonials
- ✅ Reject testimonials with reason
- ✅ Edit testimonials
- ✅ Delete testimonials
- ✅ Mark testimonials as featured
- ✅ Publish/unpublish testimonials

---

## 📋 Complete Testimonial Process

### **Step 1: Public Submission**

#### **Route:** `POST /api/v1/public/testimonials/submit`

**Who submits:**
- Customers/clients who used your services
- Project participants
- Product buyers
- Anyone who wants to give feedback

**Required Information:**
```json
{
  "content": "Testimonial text (20-2000 characters)",
  "rating": 5,  // 1-5 stars
  "author": {
    "name": "John Doe",         // Required
    "email": "john@example.com", // Optional
    "position": "CEO",           // Optional
    "company": "ABC Corp",       // Optional
    "phone": "+265999123456"     // Optional
  },
  "projectId": "optional",       // Link to specific project
  "serviceId": "optional",       // Link to specific service
  "productId": "optional"        // Link to specific product (NEW)
}
```

**What happens:**
1. System receives the testimonial
2. Status is set to **`PENDING`** automatically
3. Metadata is captured:
   - IP address
   - User agent (browser info)
   - Referrer (where they came from)
   - Submission timestamp
4. User gets confirmation message:
   > "Thank you for your testimonial! It will be reviewed and published soon."

**Authentication:**
- **Optional** (uses `optionalAuth` middleware)
- If logged in: `createdBy` is set to user ID
- If not logged in: `createdBy` is empty

---

### **Step 2: Admin Review**

#### **Who Reviews:** Web Admin
**Login:** `web@energysolutions.mw` / `Web@123456`

#### **View Pending Testimonials**
**Route:** `GET /api/v1/admin/web/testimonials?status=pending`

**What Admin Sees:**
- All pending testimonials
- Author information
- Content and rating
- Related project/service/product
- Submission metadata (IP, timestamp, etc.)

---

### **Step 3: Approval Process**

#### **Option A: Approve**

**Route:** `POST /api/v1/admin/web/testimonials/:testimonialId/approve`

**What happens:**
1. Status changes: `PENDING` → `APPROVED`
2. `approvedBy` is set to admin's user ID
3. `isPublished` can be set to `true` (optional)
4. `publishedAt` timestamp is set
5. Testimonial becomes visible on public routes

**Body:**
```json
{
  "isPublished": true,      // Make it live immediately
  "isFeatured": false       // Optionally feature it
}
```

---

#### **Option B: Reject**

**Route:** `POST /api/v1/admin/web/testimonials/:testimonialId/reject`

**Required:**
```json
{
  "rejectionReason": "Content does not meet our guidelines"
}
```

**What happens:**
1. Status changes: `PENDING` → `REJECTED`
2. `rejectionReason` is stored
3. Testimonial is NOT visible on public routes
4. Admin can still see it in the system

**Common rejection reasons:**
- Inappropriate content
- Spam
- Fake testimonial
- Violates guidelines
- Duplicate submission

---

### **Step 4: Publishing**

#### **Featured Testimonials**
**Route:** `PATCH /api/v1/admin/web/testimonials/:testimonialId`

```json
{
  "isFeatured": true,
  "displayOrder": 1
}
```

**What it does:**
- Shows on homepage/featured section
- Gets priority in lists
- Limited to 6 on public featured endpoint

#### **Display Order**
Control the order of testimonials:
- Lower number = higher priority
- `displayOrder: 0` appears first
- `displayOrder: 10` appears later

---

## 📊 Testimonial Statuses

| Status | Description | Visible to Public? | Can Edit? |
|--------|-------------|-------------------|-----------|
| **PENDING** | Just submitted, awaiting review | ❌ No | ✅ Admin only |
| **APPROVED** | Reviewed and approved by admin | ✅ Yes | ✅ Admin only |
| **REJECTED** | Rejected by admin | ❌ No | ✅ Admin only |
| **ARCHIVED** | Old/outdated testimonials | ❌ No | ✅ Admin only |

---

## 🎯 Testimonial Types

### **Text Testimonial** (Most Common)
```json
{
  "type": "text",
  "content": "Written testimonial text"
}
```

### **Video Testimonial**
```json
{
  "type": "video",
  "content": "Video description",
  "mediaUrl": "https://youtube.com/...",
  "thumbnailUrl": "https://..."
}
```

### **Audio Testimonial**
```json
{
  "type": "audio",
  "content": "Audio description",
  "mediaUrl": "https://soundcloud.com/..."
}
```

---

## 🔐 Admin Routes for Testimonials

### **View All Testimonials**
```
GET /api/v1/admin/web/testimonials
GET /api/v1/admin/web/testimonials?status=pending
GET /api/v1/admin/web/testimonials?status=approved
GET /api/v1/admin/web/testimonials?status=rejected
```

### **Create Testimonial (Admin)**
```
POST /api/v1/admin/web/testimonials
POST /api/v1/admin/web/testimonials/upload  (with files)
```

### **Approve/Reject**
```
POST /api/v1/admin/web/testimonials/:id/approve
POST /api/v1/admin/web/testimonials/:id/reject
```

### **Edit/Delete**
```
PATCH /api/v1/admin/web/testimonials/:id
DELETE /api/v1/admin/web/testimonials/:id
```

---

## 🌐 Public Routes for Testimonials

### **View Approved Testimonials**
```
GET /api/v1/public/testimonials
GET /api/v1/public/testimonials?rating=5
GET /api/v1/public/testimonials?featured=true
```

### **Featured Testimonials**
```
GET /api/v1/public/testimonials/featured
```
Returns max 6 featured testimonials

### **Submit Testimonial**
```
POST /api/v1/public/testimonials/submit
```

---

## 📝 Complete Workflow Example

### **Example 1: Customer Submits Testimonial**

1. **Customer visits website** after completing solar panel installation
2. **Fills out testimonial form:**
   ```json
   {
     "content": "Excellent service! The solar installation was completed on time and the team was very professional.",
     "rating": 5,
     "author": {
       "name": "Sarah Johnson",
       "email": "sarah@example.com",
       "company": "Johnson Enterprises"
     },
     "projectId": "68cfa0c46d5d1a2a55e91e41"
   }
   ```
3. **System creates testimonial with:**
   - Status: `PENDING`
   - IP: `192.168.1.1`
   - Submitted at: `2025-11-07T10:30:00Z`

4. **Web Admin receives notification** (via dashboard)

5. **Web Admin reviews:**
   - Checks content for appropriateness
   - Verifies the project exists
   - May contact customer to verify

6. **Web Admin approves:**
   ```
   POST /api/v1/admin/web/testimonials/68cfa2f61c6983a50824c8bf/approve
   {
     "isPublished": true,
     "isFeatured": true
   }
   ```

7. **Testimonial goes live:**
   - Appears on `/api/v1/public/testimonials`
   - Appears on `/api/v1/public/testimonials/featured`
   - Appears on homepage (frontend)

---

### **Example 2: Spam Testimonial**

1. **Spammer submits:**
   ```json
   {
     "content": "Check out my website for cheap products! www.spam.com",
     "rating": 5,
     "author": {
       "name": "Spammer"
     }
   }
   ```

2. **Web Admin reviews and rejects:**
   ```
   POST /api/v1/admin/web/testimonials/123abc/reject
   {
     "rejectionReason": "Spam - contains promotional links"
   }
   ```

3. **Testimonial marked as REJECTED**
   - Never appears publicly
   - Stored for reference
   - Admin can delete later if needed

---

## 🎨 Frontend Integration

### **Display Testimonials on Website**

```javascript
// Fetch featured testimonials for homepage
fetch('https://esl-api.onrender.com/api/v1/public/testimonials/featured')
  .then(res => res.json())
  .then(data => {
    const testimonials = data.data.testimonials;
    // Display in carousel or grid
  });

// Fetch all testimonials with filters
fetch('https://esl-api.onrender.com/api/v1/public/testimonials?rating=5&limit=10')
  .then(res => res.json())
  .then(data => {
    const testimonials = data.data;
    const avgRating = data.averageRating;
    const totalReviews = data.totalReviews;
  });
```

### **Submit Testimonial Form**

```javascript
// HTML Form
<form id="testimonialForm">
  <input name="name" required />
  <input name="email" type="email" />
  <textarea name="content" required minlength="20"></textarea>
  <select name="rating" required>
    <option value="5">5 Stars</option>
    <option value="4">4 Stars</option>
    <!-- ... -->
  </select>
  <button type="submit">Submit</button>
</form>

// JavaScript
document.getElementById('testimonialForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    content: formData.get('content'),
    rating: parseInt(formData.get('rating')),
    author: {
      name: formData.get('name'),
      email: formData.get('email')
    }
  };

  const response = await fetch('https://esl-api.onrender.com/api/v1/public/testimonials/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (result.success) {
    alert('Thank you! Your testimonial will be reviewed soon.');
  }
});
```

---

## 📊 Statistics

### **Get Testimonial Stats**

Included in platform statistics:
```
GET /api/v1/public/statistics
```

Returns:
```json
{
  "testimonials": {
    "averageRating": 4.8,
    "totalReviews": 127
  }
}
```

---

## 🔒 Security Features

### **Public Submission Protection:**
- ✅ Rate limiting (prevent spam)
- ✅ Content length limits (20-2000 chars)
- ✅ Rating validation (1-5 only)
- ✅ IP tracking
- ✅ Manual approval required

### **Data Privacy:**
- ✅ Email not required for submission
- ✅ Email hidden from public view (only admin sees)
- ✅ Phone hidden from public view
- ✅ IP address only visible to admin

### **Admin Controls:**
- ✅ Approval workflow prevents fake reviews
- ✅ Rejection with reason tracking
- ✅ Ability to archive old testimonials
- ✅ Full edit/delete capabilities

---

## 🎯 Best Practices

### **For Admins:**
1. **Review promptly** - Check testimonials daily
2. **Be selective** - Only approve genuine, high-quality testimonials
3. **Verify authenticity** - Contact submitter if suspicious
4. **Feature the best** - Highlight exceptional testimonials
5. **Respond to authors** - Thank them via email (manual process)

### **For Public Users:**
1. **Be specific** - Mention actual services/projects
2. **Be honest** - Genuine feedback is valuable
3. **Include details** - Company name, position adds credibility
4. **Link to project** - Reference specific work done

---

## 📞 Admin Login

**Web Admin Account:**
- **Email:** `web@energysolutions.mw`
- **Password:** `Web@123456`
- **Role:** `WEB_ADMIN`
- **Permissions:** Manage testimonials, services, projects, staff, slides

**Admin Dashboard:**
```
POST /api/v1/auth/login
{
  "email": "web@energysolutions.mw",
  "password": "Web@123456"
}
```

---

## 📚 Related Documentation

- [Public Routes Test Report](PUBLIC_ROUTES_TEST_REPORT.md)
- [Web Admin API Guide](postman/WEB_ADMIN_README.md)
- [Testimonial Model](src/modules/admin/web-admin/models/testimonial.model.ts)

---

**Summary:**
- **Public submits** → **PENDING** → **Admin reviews** → **APPROVE/REJECT** → **Published (if approved)**
- **Responsible:** Web Admin
- **Process:** Manual approval required
- **Security:** Multiple validation layers
- **Visibility:** Only approved testimonials appear publicly

---

*Last Updated: 2025-11-07*
