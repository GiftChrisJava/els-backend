# Sales Admin Offline Sales - Implementation Summary

## Changes Made

### 1. Service Layer (`sales-admin.service.ts`)

#### Enhanced Customer Logic in `recordOfflineSale()`

- **Before**: Always created new guest customer when no customer ID provided
- **After**: Smart customer matching with auto-creation

**New Flow**:

```typescript
1. Check if customer ID provided → Use it directly
2. No ID but customerInfo provided:
   a. Search by email (if provided)
   b. If not found, search by phone (if provided)
   c. If found → Use existing customer
   d. If not found → Create new customer
```

**Key Changes**:

- Added customer search by email: `Customer.findOne({ email })`
- Added fallback search by phone: `Customer.findOne({ phone })`
- Only creates customer if not found by email OR phone
- Marks as guest only when no email provided (`isGuest: !email`)
- Logs customer creation/finding for debugging

---

### 2. Validation Layer (`sales-admin.validator.ts`)

#### Updated `validateRecordOfflineSale`

**Customer Info Validation**:

```typescript
// Before
customerInfo: Joi.object({
  phone: Joi.string().required(), // Phone always required
});

// After
customerInfo: Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
}).or("email", "phone"); // At least one required
```

**Shipping Address**:

```typescript
// Before
shippingAddress: Joi.object({...}).required()

// After
shippingAddress: Joi.object({...}).optional()  // Not needed for walk-in sales
```

**Benefits**:

- ✅ Flexible customer identification (email OR phone, not both required)
- ✅ Shipping address optional for in-store purchases
- ✅ Better validation error messages

---

### 3. Product Model (`product.model.ts`)

#### Pricing Schema Update

**Changed `cost` field from required to optional**:

```typescript
// Before
cost: {
  type: Number,
  required: [true, "Product cost is required"]
}

// After
cost: {
  type: Number,
  required: false  // Optional - only price is mandatory
}
```

**Interface Update**:

```typescript
interface IPricing {
  cost?: number; // Now optional
  price: number; // Still required
  // ... other fields
}
```

---

### 4. Product Validators (`sales-admin.validator.ts`)

#### Updated Pricing Validation

**Create Product**:

```typescript
// Before
pricing: Joi.object({
  cost: Joi.number().min(0).required(),
  price: Joi.number().min(0).required(),
});

// After
pricing: Joi.object({
  cost: Joi.number().min(0).optional(), // Now optional
  price: Joi.number().min(0).required(), // Still required
});
```

**Update Product**: Already had all pricing fields as optional ✅

---

### 5. Image Upload Fix (`sales-admin.controller.ts`)

#### Appwrite Integration

**Changed from local paths to Appwrite URLs**:

**Create Product**:

```typescript
// Before
if (files.featuredImage?.[0]) {
  req.body.featuredImage = `/uploads/${files.featuredImage[0].filename}`;
}

// After
if (files.featuredImage?.[0]) {
  const featuredImageUrl = await appwriteService.uploadImage(
    files.featuredImage[0],
    "products"
  );
  req.body.featuredImage = featuredImageUrl; // Appwrite CDN URL
}
```

**Gallery Images**:

```typescript
// Before
if (files.images?.length > 0) {
  req.body.images = files.images.map((f) => `/uploads/${f.filename}`);
}

// After
if (files.images?.length > 0) {
  const imageUrls = await appwriteService.uploadMultipleImages(
    files.images,
    "products/gallery"
  );
  req.body.images = imageUrls; // Array of Appwrite URLs
}
```

**Categories**:

```typescript
// Category image upload
if (files.image?.[0]) {
  const imageUrl = await appwriteService.uploadImage(
    files.image[0],
    "categories"
  );
  req.body.image = imageUrl;
}

// Category icon upload
if (files.icon?.[0]) {
  const iconUrl = await appwriteService.uploadImage(
    files.icon[0],
    "categories/icons"
  );
  req.body.icon = iconUrl;
}
```

**Benefits**:

- ✅ Proper cloud storage integration
- ✅ No more `/uploads/undefined` errors
- ✅ Actual CDN URLs in responses
- ✅ Files accessible from anywhere (not just local server)

---

### 6. Postman Collection Updates

#### New Offline Sale Examples

**Added 3 New Request Examples**:

1. **Record Offline Sale (Walk-in Customer - New)**

   - Full customer details (firstName, lastName, email, phone)
   - Shows new customer creation

2. **Record Offline Sale (Phone Only - Returning Customer)**

   - Only phone number provided
   - Shows existing customer lookup by phone

3. **Record Offline Sale (Email Only)**
   - Only email provided
   - Shows existing customer lookup by email

**Updated Existing Example**:

- Renamed "Record Offline Sale (Existing Customer)" → "Record Offline Sale (Existing Customer ID)"
- Removed unnecessary `shippingAddress` field
- Simplified to show direct customer ID usage

---

### 7. Documentation

#### Created `OFFLINE_SALES_GUIDE.md`

Comprehensive guide covering:

- ✅ Customer identification flow diagram
- ✅ 4 usage scenarios with examples
- ✅ Validation rules
- ✅ Order processing details
- ✅ Inventory impact explanation
- ✅ Customer data management
- ✅ Best practices (DO/DON'T)
- ✅ Error handling guide
- ✅ Testing workflow

---

## Business Logic Summary

### Customer Matching Priority

```
1. Customer ID provided → Use directly (skip search)
2. Email in customerInfo → Search by email
3. Phone in customerInfo → Search by phone
4. Not found → Create new customer
```

### Customer Creation Rules

```
Has Email?
├── YES → Create regular customer (isGuest: false)
└── NO  → Create guest customer (isGuest: true)
            └── Auto-generate email: guest_{timestamp}@offline.local
```

### Offline Order Processing

```
1. Validate customer info (email OR phone required)
2. Find/create customer
3. Validate product inventory
4. Create order with:
   - type: "offline"
   - status: "delivered" (immediate)
   - paymentStatus: "paid"
5. Update inventory immediately (no reservation)
6. Update customer metrics
7. Return complete order with customer details
```

---

## Testing Checklist

### ✅ Completed

- [x] TypeScript compilation passes
- [x] Validators updated for optional fields
- [x] Customer model supports guest customers
- [x] Service layer implements smart customer matching
- [x] Image uploads use Appwrite storage
- [x] Postman collection includes all scenarios
- [x] Documentation created

### 🔄 Needs Testing

- [ ] Create product with images → Verify Appwrite URLs in response
- [ ] Create category without images → Should succeed (no 400 error)
- [ ] Offline sale with new customer (email+phone) → Creates customer
- [ ] Offline sale with existing customer (phone only) → Finds customer
- [ ] Offline sale with existing customer (email only) → Finds customer
- [ ] Offline sale with customer ID → Uses existing customer
- [ ] Inventory updated immediately after offline sale
- [ ] Guest customer created when only phone provided

---

## Files Modified

1. **Service**: `src/modules/admin/sales-admin/services/sales-admin.service.ts`

   - Enhanced `recordOfflineSale()` method (lines ~450-550)

2. **Validator**: `src/modules/admin/sales-admin/validators/sales-admin.validator.ts`

   - Updated `validateRecordOfflineSale` (lines ~353-408)
   - Updated `validateCreateProduct` pricing validation

3. **Model**: `src/modules/admin/sales-admin/models/product.model.ts`

   - Changed `cost` field to optional in schema
   - Updated `IPricing` interface

4. **Controller**: `src/modules/admin/sales-admin/controllers/sales-admin.controller.ts`

   - `createProduct()` - Appwrite image upload
   - `updateProduct()` - Appwrite image upload
   - `createCategory()` - Appwrite image upload

5. **Postman**: `postman/Sales-Admin-API.postman_collection.json`

   - Updated offline sale examples
   - Added 3 new request variations

6. **Documentation**: `postman/OFFLINE_SALES_GUIDE.md`
   - New comprehensive guide (319 lines)

---

## Key Improvements

### 1. **Better Customer Experience**

- No duplicate customer records created
- Returning customers automatically recognized
- Flexible identification (email OR phone)

### 2. **Sales Admin Efficiency**

- Minimal info required to record sale
- No need to search for customer ID manually
- System handles customer lookup automatically

### 3. **Data Integrity**

- Prevents duplicate customer creation
- Maintains accurate customer purchase history
- Proper guest vs registered customer tracking

### 4. **Image Handling**

- Real cloud URLs instead of local paths
- No more undefined image errors
- Proper CDN delivery

### 5. **Flexibility**

- Optional cost field (only price required)
- Optional shipping address for walk-in sales
- Multiple ways to identify customers

---

## Next Steps (Recommended)

1. **Test Image Uploads**

   - Upload product with actual image files
   - Verify Appwrite URL format in response
   - Test image accessibility from CDN

2. **Test Customer Scenarios**

   - Create offline sale for new customer
   - Create offline sale for returning customer (by phone)
   - Create offline sale for returning customer (by email)
   - Verify no duplicates created

3. **Test Inventory Updates**

   - Record offline sale
   - Verify inventory reduced immediately
   - Check product stock status updates

4. **Edge Cases**

   - Test with invalid phone format
   - Test with invalid email format
   - Test with insufficient inventory
   - Test with non-existent product ID

5. **Performance Testing**
   - Test with large image files (near 10MB limit)
   - Test concurrent offline sales
   - Test customer lookup performance

---

## Migration Notes

### Breaking Changes

⚠️ **None** - All changes are backward compatible

### Database Changes

✅ **No migration needed** - Optional fields don't require data migration

### API Changes

✅ **Backward compatible** - New flexibility doesn't break existing requests

---

## Support

For questions or issues:

1. Check `OFFLINE_SALES_GUIDE.md` for usage examples
2. Review Postman collection for request formats
3. Check service logs for customer search/creation messages
4. Verify Appwrite configuration if image uploads fail
