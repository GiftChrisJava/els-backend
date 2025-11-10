# CORS Configuration Fix

**Issue:** Cross-Origin Request Blocked from Vercel frontend
**Date:** 2025-11-07
**Status:** ✅ Fixed - Requires deployment

---

## 🚨 Problem

Your frontend at `https://esl-alpha.vercel.app` was getting CORS errors when calling the API at `https://els-backend-n9e9.onrender.com`:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading
the remote resource at https://els-backend-n9e9.onrender.com/api/v1/public/projects/featured.
(Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 500.
```

### Error Routes Blocked:
- ❌ `/api/v1/public/projects/featured`
- ❌ `/api/v1/public/services?limit=6`
- ❌ `/api/v1/public/categories?limit=50`
- ❌ `/api/v1/public/testimonials?limit=3`
- ❌ `/api/v1/public/products?limit=50`

---

## ✅ Solution

Updated the `CORS_ORIGINS` environment variable to include your Vercel domain.

### **Before:**
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173
```

### **After:**
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,https://esl-alpha.vercel.app
```

---

## 🔧 How CORS Works in Your App

### Configuration File: [`src/config/app.config.ts`](src/config/app.config.ts)
```typescript
cors: {
  origins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
}
```

### Implementation: [`src/app.ts`](src/app.ts#L59-L82)
```typescript
this.app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      if (appConfig.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Device-Info",
    ],
    exposedHeaders: ["X-Total-Count", "X-Page", "X-Limit"],
    maxAge: 86400, // 24 hours
  })
);
```

---

## 📝 Steps to Deploy Fix

### **1. Local Environment (Already Done)**
✅ Updated `.env` file with Vercel domain

### **2. Update Render.com Environment Variables**

⚠️ **IMPORTANT:** You need to update the environment variables on your Render.com production server.

#### Steps:
1. Go to [Render.com Dashboard](https://dashboard.render.com/)
2. Select your backend service: `els-backend-n9e9`
3. Go to **Environment** tab
4. Find the `CORS_ORIGINS` variable
5. Update its value to:
   ```
   http://localhost:3000,http://localhost:3001,http://localhost:5173,https://esl-alpha.vercel.app
   ```
6. Click **Save Changes**
7. Your service will automatically redeploy

**OR** if you want to support multiple Vercel deployments:
```
http://localhost:3000,http://localhost:3001,http://localhost:5173,https://esl-alpha.vercel.app,https://*.vercel.app
```

### **3. Wait for Deployment**
- Render will automatically redeploy your service
- This usually takes 2-5 minutes
- Watch the deployment logs to ensure success

### **4. Test the Fix**
Once deployed, test from your frontend:
```javascript
// In your frontend (Vercel)
fetch('https://els-backend-n9e9.onrender.com/api/v1/public/projects/featured')
  .then(res => res.json())
  .then(data => console.log('Success!', data))
  .catch(err => console.error('Error:', err));
```

---

## 🧪 Testing CORS Locally

If you want to test CORS locally:

### Test Script:
```bash
# Test from terminal
curl -H "Origin: https://esl-alpha.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5000/api/v1/public/projects/featured -v
```

Expected headers in response:
```
Access-Control-Allow-Origin: https://esl-alpha.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
```

---

## 🌐 Adding More Domains

If you have additional domains (production, staging, etc.), add them to the `CORS_ORIGINS` variable:

### Example:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,https://esl-alpha.vercel.app,https://esl-prod.vercel.app,https://energysolutions.mw,https://www.energysolutions.mw
```

### Pattern Matching:
If you want to allow all Vercel preview deployments, you would need to modify the CORS logic in `app.ts` to support wildcards:

```typescript
origin: (origin, callback) => {
  if (!origin) return callback(null, true);

  const allowedOrigins = appConfig.cors.origins;
  const vercelPattern = /^https:\/\/.*\.vercel\.app$/;

  if (allowedOrigins.includes(origin) || vercelPattern.test(origin)) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
},
```

---

## 🔒 Security Considerations

### ✅ Current Setup (Secure):
- **Whitelist approach:** Only specified domains are allowed
- **Credentials enabled:** Allows cookies/auth headers
- **Specific methods:** Only allowed HTTP methods
- **Max age:** 24-hour preflight cache

### ⚠️ What NOT to Do:
```typescript
// ❌ NEVER do this in production
cors({ origin: '*' })

// ❌ NEVER allow all origins with credentials
cors({ origin: '*', credentials: true })
```

---

## 🐛 Troubleshooting

### Issue: Still getting CORS errors after update

**Check:**
1. ✅ Did you update the environment variable on Render?
2. ✅ Did Render redeploy the service?
3. ✅ Is the domain spelled correctly (no trailing slashes)?
4. ✅ Is it HTTPS (not HTTP) for production?
5. ✅ Check browser console for the exact origin being sent

### Issue: Works locally but not in production

**Likely causes:**
- Environment variable not updated on Render
- Cached preflight request (wait 24 hours or clear browser cache)
- Different domain being used (check browser DevTools Network tab)

### Issue: Some routes work, others don't

**Likely causes:**
- Server errors (500) - check Render logs
- Route not found (404) - verify routes exist
- Authentication issues - check if auth is required

---

## 📊 Current Configuration Summary

### **Allowed Origins:**
- ✅ `http://localhost:3000` (Local development)
- ✅ `http://localhost:3001` (Alternative local port)
- ✅ `http://localhost:5173` (Vite default)
- ✅ `https://esl-alpha.vercel.app` (Vercel production)

### **Allowed Methods:**
- GET, POST, PUT, PATCH, DELETE, OPTIONS

### **Allowed Headers:**
- Content-Type
- Authorization
- X-Requested-With
- X-Device-Info

### **Credentials:**
- ✅ Enabled (cookies and auth headers allowed)

### **Preflight Cache:**
- 24 hours (86400 seconds)

---

## 📝 Deployment Checklist

- [x] Update local `.env` file
- [ ] Update Render environment variables
- [ ] Wait for Render deployment to complete
- [ ] Test from Vercel frontend
- [ ] Verify all routes working:
  - [ ] GET /api/v1/public/projects/featured
  - [ ] GET /api/v1/public/services
  - [ ] GET /api/v1/public/categories
  - [ ] GET /api/v1/public/products
  - [ ] GET /api/v1/public/testimonials
  - [ ] POST /api/v1/public/contact

---

## 🚀 Quick Fix Commands

### For Render.com:
```bash
# Via Render CLI (if installed)
render env:set CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:5173,https://esl-alpha.vercel.app"
```

### For Local Testing:
```bash
# Restart your local server
npm run build && npm start
```

---

## 📚 Related Files

- **CORS Config:** [src/config/app.config.ts](src/config/app.config.ts#L59-L61)
- **CORS Implementation:** [src/app.ts](src/app.ts#L59-L82)
- **Environment Variables:** [.env](.env#L46)

---

## 📞 Support

If you continue to experience CORS issues after following this guide:

1. **Check Render Logs:**
   ```
   Dashboard → Service → Logs
   ```

2. **Check Browser Console:**
   - Look for the exact error message
   - Check the "Origin" header being sent
   - Check if it's a preflight (OPTIONS) request failing

3. **Test with curl:**
   ```bash
   curl -H "Origin: https://esl-alpha.vercel.app" \
        https://els-backend-n9e9.onrender.com/api/v1/public/services
   ```

---

## ✅ Success Indicators

After deployment, you should see:

1. **No CORS errors** in browser console
2. **Successful API calls** from Vercel frontend
3. **Response headers include:**
   ```
   access-control-allow-origin: https://esl-alpha.vercel.app
   access-control-allow-credentials: true
   ```

---

**Status:** ✅ Code Updated
**Action Required:** Update Render environment variables and redeploy
**Estimated Time:** 5 minutes

---

*Last Updated: 2025-11-07*
