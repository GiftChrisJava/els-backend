# Offline Sales Guide - Sales Admin Module

## Overview

The offline sales feature allows sales admins to record in-store/walk-in purchases where customers physically buy products without using the website.

## Key Features

✅ **Smart Customer Matching**: Automatically finds existing customers by email or phone  
✅ **Auto Customer Creation**: Creates new customer records if not found  
✅ **Minimal Input Required**: Only email OR phone needed to identify/create customer  
✅ **Immediate Inventory Updates**: Stock is reduced instantly (no reservation phase)  
✅ **Guest Customer Support**: Customers without email are marked as guests  
✅ **No Shipping Required**: Shipping address is optional for walk-in sales

---

## How It Works

### Customer Identification Flow

```
Sales Admin Records Sale
         ↓
Has customer ID?
    ├── YES → Use existing customer
    └── NO → Check customerInfo
              ↓
        Has email?
            ├── YES → Search by email
            │         ├── Found → Use existing customer
            │         └── Not Found → Create new customer
            └── NO → Has phone?
                      ├── YES → Search by phone
                      │         ├── Found → Use existing customer
                      │         └── Not Found → Create new customer
                      └── NO → Error (need email OR phone)
```

### Customer Creation Logic

**When creating a new customer:**

- Email provided → Regular customer account
- Only phone (no email) → Guest customer (marked with `isGuest: true`)
- Auto-generates email for guests: `guest_{timestamp}@offline.local`
- Sets source as `offline_sale` for tracking

---

## API Usage Examples

### Scenario 1: New Walk-in Customer

**Customer**: First-time buyer, provides phone and email

```json
POST /api/v1/admin/sales/orders/offline
{
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+265999777888",
    "email": "john.doe@example.com"
  },
  "items": [
    {
      "product": "product_id_here",
      "quantity": 2,
      "price": 250,
      "tax": 50
    }
  ],
  "subtotal": 500,
  "taxAmount": 50,
  "totalAmount": 550,
  "paymentMethod": "cash"
}
```

**System Action**:

1. Searches for customer with email `john.doe@example.com`
2. Not found → Creates new customer
3. Records sale and updates inventory immediately

---

### Scenario 2: Returning Customer (Phone Only)

**Customer**: Returning buyer, sales admin only has their phone number

```json
POST /api/v1/admin/sales/orders/offline
{
  "customerInfo": {
    "phone": "+265999777888"
  },
  "items": [
    {
      "product": "product_id_here",
      "quantity": 1,
      "price": 250,
      "tax": 25
    }
  ],
  "subtotal": 250,
  "taxAmount": 25,
  "totalAmount": 275,
  "paymentMethod": "cash"
}
```

**System Action**:

1. Searches for customer with phone `+265999777888`
2. Found → Uses existing customer record
3. Records sale under existing customer's history

---

### Scenario 3: Returning Customer (Email Only)

**Customer**: Known customer, identified by email

```json
POST /api/v1/admin/sales/orders/offline
{
  "customerInfo": {
    "email": "existing.customer@example.com"
  },
  "items": [
    {
      "product": "product_id_here",
      "quantity": 3,
      "price": 250,
      "tax": 75
    }
  ],
  "subtotal": 750,
  "taxAmount": 75,
  "totalAmount": 825,
  "paymentMethod": "mobile_money"
}
```

**System Action**:

1. Searches for customer with email `existing.customer@example.com`
2. Found → Uses existing customer
3. Updates customer's purchase history and metrics

---

### Scenario 4: Customer ID Known

**Customer**: Sales admin has the customer's database ID

```json
POST /api/v1/admin/sales/orders/offline
{
  "customer": "customer_id_here",
  "items": [
    {
      "product": "product_id_here",
      "quantity": 1,
      "price": 250,
      "tax": 25
    }
  ],
  "subtotal": 250,
  "taxAmount": 25,
  "totalAmount": 275,
  "paymentMethod": "cash"
}
```

**System Action**:

1. Uses provided customer ID directly
2. No search or creation needed
3. Records sale immediately

---

## Validation Rules

### Required Fields

✅ Must provide **ONE** of:

- `customer` (customer ID)
- `customerInfo` with at least `email` OR `phone`

✅ `items` array with at least 1 product
✅ `subtotal`, `taxAmount`, `totalAmount`
✅ `paymentMethod` (cash, mobile_money, credit_card, etc.)

### Optional Fields

⚪ `customerInfo.firstName`, `customerInfo.lastName`, `customerInfo.name`
⚪ `shippingAddress` (not needed for walk-in sales)
⚪ `discount`
⚪ `internalNotes`, `customerNotes`

---

## Order Processing

### Offline Sale Characteristics

- **Type**: Set to `offline`
- **Status**: Automatically set to `delivered`
- **Payment Status**: Automatically set to `paid`
- **Payment Date**: Set to current timestamp
- **Delivery Date**: Set to current timestamp (immediate)
- **Inventory**: Updated immediately (no reservation)

### Inventory Impact

```
Before Sale: Product Stock = 100
↓
Offline Sale: Quantity = 5
↓
After Sale: Product Stock = 95 (immediate update)
```

**No reservation phase** - stock is permanently reduced when sale is recorded.

---

## Customer Data Management

### New Customer Creation

```json
{
  "firstName": "From customerInfo or 'Guest'",
  "lastName": "From customerInfo or 'Customer'",
  "email": "From customerInfo or generated",
  "phone": "From customerInfo",
  "type": "individual",
  "status": "active",
  "isGuest": true/false,  // true if no email provided
  "source": "offline_sale",
  "createdBy": "sales_admin_id"
}
```

### Guest vs Regular Customer

| Aspect         | Regular Customer      | Guest Customer                           |
| -------------- | --------------------- | ---------------------------------------- |
| Email          | Real email provided   | Auto-generated (`guest_*@offline.local`) |
| `isGuest` flag | `false`               | `true`                                   |
| Tracking       | Full purchase history | Full purchase history                    |
| Loyalty        | Eligible              | Eligible                                 |
| Marketing      | Can receive emails    | No email marketing                       |

---

## Best Practices

### ✅ DO

- Always collect at least phone OR email from customers
- Use existing customer ID if available for faster processing
- Add internal notes for special circumstances
- Verify payment before recording sale
- Double-check quantities before submission

### ❌ DON'T

- Don't create duplicate customers - let system search first
- Don't skip payment verification
- Don't record sales before receiving payment
- Don't forget to update inventory if system fails

---

## Error Handling

### Common Errors

**1. Missing Customer Info**

```json
{
  "error": "Either customer ID or customerInfo with email/phone is required"
}
```

**Solution**: Provide at least email OR phone in `customerInfo`

---

**2. Product Not Found**

```json
{
  "error": "Product with ID xxx not found"
}
```

**Solution**: Verify product ID is correct and product exists

---

**3. Insufficient Inventory**

```json
{
  "error": "Insufficient inventory for product Solar Panel. Available: 5, Required: 10"
}
```

**Solution**: Check stock levels before recording sale, reduce quantity

---

**4. Invalid Payment Method**

```json
{
  "error": "Payment method must be one of: cash, mobile_money, credit_card, bank_transfer, pos"
}
```

**Solution**: Use valid payment method from enum

---

## Testing in Postman

The collection includes these offline sale examples:

1. **Record Offline Sale (Existing Customer ID)** - Use when you have customer ID
2. **Record Offline Sale (Walk-in Customer - New)** - New customer with full details
3. **Record Offline Sale (Phone Only - Returning Customer)** - Find by phone
4. **Record Offline Sale (Email Only)** - Find by email

### Test Workflow

```
1. Login as Sales Admin
   ↓
2. Create a category
   ↓
3. Create a product with inventory
   ↓
4. Record offline sale (any method)
   ↓
5. Verify order created with status "delivered"
   ↓
6. Check product inventory reduced
   ↓
7. Check customer record created/updated
```

---

## Support

For issues or questions, contact the development team or refer to:

- Main API Documentation: `README.md`
- Sales Admin README: `SALES_ADMIN_README.md`
- Postman Collection: `Sales-Admin-API.postman_collection.json`
