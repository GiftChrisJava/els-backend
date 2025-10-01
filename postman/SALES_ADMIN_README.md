# Sales Admin API - Postman Collection

## Overview

This Postman collection provides comprehensive API testing for the Sales Admin module of Energy Solutions Backend. It includes endpoints for managing products, categories, orders, customers, and analytics.

## Features

- ✅ Product Management (CRUD operations)
- ✅ Category Management with hierarchical tree structure
- ✅ Order Management (Online & Offline sales)
- ✅ Customer Management & Analytics
- ✅ Sales Analytics & Reporting
- ✅ Inventory Management (Single & Bulk updates)
- ✅ File Upload Support (Product images, Category images)

## Setup Instructions

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `Sales-Admin-API.postman_collection.json`
4. The collection will be imported with all endpoints

### 2. Environment Variables

The collection uses these variables (set automatically or manually):

| Variable                 | Description          | Auto-set | Example                            |
| ------------------------ | -------------------- | -------- | ---------------------------------- |
| `baseUrl`                | API base URL         | No       | `http://localhost:5000`            |
| `salesAdminEmail`        | Sales admin email    | No       | `sales@energysolutions.com`        |
| `salesAdminPassword`     | Sales admin password | No       | `Sales@Admin123`                   |
| `salesAdminToken`        | Access token         | Yes      | Auto-set on login                  |
| `salesAdminRefreshToken` | Refresh token        | Yes      | Auto-set on login                  |
| `salesAdminId`           | Sales admin user ID  | Yes      | Auto-set on login                  |
| `productId`              | Created product ID   | Yes      | Auto-set on product creation       |
| `categoryId`             | Created category ID  | Yes      | Auto-set on category creation      |
| `orderId`                | Created order ID     | Yes      | Auto-set on order creation         |
| `customerId`             | Customer ID          | No       | Set manually or from customer list |

### 3. Authentication Flow

1. **Login**: Run "Sales Admin Login" to authenticate
   - This automatically sets `salesAdminToken` and `salesAdminRefreshToken`
2. **Token Refresh**: When token expires, run "Refresh Sales Admin Token"
3. All other requests automatically use the bearer token

## API Endpoints

### Products (`/api/v1/admin/sales/products`)

#### Create Product

- **Method**: POST
- **Auth**: Required (Sales Admin or System Admin)
- **Body**: Form-data (supports file uploads)
- **Files**: `featuredImage` (single), `images` (multiple)
- **Response**: Sets `productId` variable

**Required Fields:**

```json
{
  "name": "Product Name",
  "sku": "UNIQUE-SKU",
  "description": "Full description",
  "category": "categoryId",
  "pricing": {
    "cost": 150,
    "price": 250,
    "currency": "USD"
  },
  "inventory": {
    "quantity": 100,
    "lowStockThreshold": 10,
    "trackInventory": true
  }
}
```

#### Get All Products

- **Method**: GET
- **Auth**: Required
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `sort` (default: -createdAt)
  - `search` (optional): Search in name, SKU, description
  - `category` (optional): Filter by category ID
  - `status` (optional): active, inactive, draft, archived
  - `featured` (optional): true/false
  - `inStock` (optional): true/false
  - `minPrice` (optional): Minimum price filter
  - `maxPrice` (optional): Maximum price filter

#### Update Product

- **Method**: PUT
- **Auth**: Required
- **Params**: `productId`
- **Body**: Form-data (supports file uploads)

#### Update Inventory

- **Method**: PATCH
- **Endpoint**: `/products/:id/inventory`
- **Body**:

```json
{
  "quantity": 50,
  "operation": "add" // or "subtract"
}
```

#### Quick Inventory Update (Manual Sales)

- **Method**: PATCH
- **Endpoint**: `/products/:productId/inventory/quick`
- **Description**: For immediate inventory adjustments when offline sales occur
- **Body**:

```json
{
  "quantity": 5,
  "operation": "subtract",
  "reason": "Manual sale - customer walked in"
}
```

#### Bulk Update Inventory

- **Method**: POST
- **Endpoint**: `/products/inventory/bulk`
- **Body**:

```json
{
  "updates": [
    {
      "productId": "id1",
      "quantity": 20,
      "operation": "add"
    },
    {
      "productId": "id2",
      "quantity": 10,
      "operation": "subtract"
    }
  ]
}
```

### Categories (`/api/v1/admin/sales/categories`)

#### Create Category

- **Method**: POST
- **Auth**: Required
- **Body**: Form-data
- **Files**: `image` (category image), `icon` (category icon)
- **Response**: Sets `categoryId` variable

**Required Fields:**

```json
{
  "name": "Category Name",
  "description": "Category description",
  "isActive": true,
  "isFeatured": false,
  "displayOrder": 1
}
```

#### Get Category Tree

- **Method**: GET
- **Auth**: Required
- **Response**: Hierarchical tree structure of all categories

### Orders (`/api/v1/admin/sales/orders`)

#### Create Order

- **Method**: POST
- **Auth**: Required
- **Body**: JSON
- **Response**: Sets `orderId` variable

**Required Fields:**

```json
{
  "type": "online",
  "customer": "customerId",
  "items": [
    {
      "product": "productId",
      "quantity": 2,
      "price": 250,
      "discount": 0,
      "tax": 25
    }
  ],
  "subtotal": 500,
  "taxAmount": 50,
  "shippingCost": 20,
  "totalAmount": 570,
  "paymentMethod": "credit_card",
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+265999123456",
    "addressLine1": "123 Main St",
    "city": "Lilongwe",
    "country": "Malawi"
  }
}
```

#### Get All Orders

- **Method**: GET
- **Auth**: Required
- **Query Params**:
  - `page`, `limit`, `sort`
  - `search`: Search by order number or customer info
  - `status`: pending, processing, shipped, delivered, cancelled, refunded
  - `paymentStatus`: pending, paid, failed, refunded
  - `customer`: Filter by customer ID
  - `dateFrom`, `dateTo`: Date range filter
  - `minAmount`, `maxAmount`: Amount range filter

#### Update Order Status

- **Method**: PATCH
- **Endpoint**: `/orders/:id/status`
- **Body**:

```json
{
  "status": "processing",
  "notes": "Order is being processed"
}
```

#### Record Offline Sale

- **Method**: POST
- **Endpoint**: `/orders/offline`
- **Description**: Records in-store or offline purchases
- **Note**: Automatically sets type to "offline" and status to "delivered"

**Option 1: With Existing Customer ID**

```json
{
  "customer": "customerId",
  "items": [...],
  "totalAmount": 275,
  "paymentMethod": "cash"
}
```

**Option 2: Walk-in Customer (No Customer ID)**

```json
{
  "customerInfo": {
    "name": "John Walk-in",
    "phone": "+265999777888",
    "email": "john.walkin@example.com"
  },
  "items": [...],
  "totalAmount": 528,
  "paymentMethod": "cash"
}
```

#### Export Orders

- **Method**: GET
- **Endpoint**: `/orders/export`
- **Response**: CSV file download
- **Query Params**: Same as "Get All Orders"

### Customers (`/api/v1/admin/sales/customers`)

#### Get All Customers

- **Method**: GET
- **Auth**: Required
- **Query Params**:
  - `page`, `limit`, `sort`
  - `search`: Search by name, email, phone
  - `status`: active, inactive, suspended
  - `type`: individual, business, wholesale
  - `segment`: regular, vip, premium
  - `loyaltyTier`: bronze, silver, gold, platinum

#### Get Customer Details

- **Method**: GET
- **Auth**: Required
- **Params**: `customerId`
- **Response**: Customer info + order history

### Analytics (`/api/v1/admin/sales/analytics`)

#### Get Sales Analytics

- **Method**: GET
- **Auth**: Required
- **Query Params**:
  - `period`: hourly, daily, weekly, monthly, quarterly, yearly
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)
- **Response**: Comprehensive analytics including:
  - Sales metrics
  - Top products
  - Customer metrics
  - Channel performance
  - Payment methods
  - Growth rates

#### Get Dashboard Stats

- **Method**: GET
- **Auth**: Required
- **Response**: Real-time dashboard statistics

#### Get Best Selling Products

- **Method**: GET
- **Auth**: Required
- **Query Params**:
  - `limit` (default: 10)
  - `from`: Start date (optional)
  - `to`: End date (optional)

## Testing Workflow

### Basic Flow

1. ✅ **Login** → Get authentication token
2. ✅ **Create Category** → Get category ID
3. ✅ **Create Product** → Attach to category, upload images
4. ✅ **Create Order** → Process a sale
5. ✅ **View Analytics** → Check sales performance

### File Upload Testing

1. **Product Images**:

   - Select `featuredImage` field → Choose file
   - Select `images` field → Choose multiple files
   - Send request

2. **Category Images**:
   - Select `image` field → Choose category banner
   - Select `icon` field → Choose category icon
   - Send request

### Advanced Testing

1. **Inventory Management**:

   - Create product with initial stock
   - Add inventory using PATCH
   - Create order (reduces stock automatically)
   - Check product inventory levels

2. **Manual/Offline Sales Workflow**:

   - **Option A**: Quick inventory update for immediate sales
     - Use "Quick Inventory Update" to subtract inventory
     - Record the sale reason (walk-in customer, etc.)
   - **Option B**: Full offline sale recording
     - Use "Record Offline Sale (Walk-in Customer)"
     - Provide customer name and phone
     - Inventory automatically updated
     - Creates guest customer record
     - Order shows in orders list

3. **Order Processing**:

   - Create order → Status: pending
   - Update to "processing" → Inventory reserved
   - Update to "shipped" → Tracking updates
   - Update to "delivered" → Inventory finalized

4. **Analytics**:
   - Create multiple orders (online and offline)
   - Generate analytics for different periods
   - Compare growth rates
   - Export orders to CSV

## Response Examples

### Success Response (Product Created)

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "67890abc",
    "name": "Solar Panel 300W",
    "sku": "SP-300W-001",
    "slug": "solar-panel-300w",
    "pricing": {
      "price": 250,
      "cost": 150
    },
    "inventory": {
      "quantity": 100,
      "availableQuantity": 100
    },
    "featuredImage": "https://cloud.appwrite.io/v1/storage/...",
    "images": ["https://cloud.appwrite.io/v1/storage/..."]
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Product with SKU 'SP-300W-001' already exists",
  "statusCode": 400
}
```

## Authorization

All endpoints require:

- ✅ Valid JWT token in Authorization header
- ✅ Role: `sales-admin` or `system-admin`

The collection automatically includes the bearer token in all requests after successful login.

## Notes

### Product Status Values

- `active`: Available for sale
- `inactive`: Not visible to customers
- `draft`: Work in progress
- `archived`: Historical record

### Order Status Flow

```
pending → processing → shipped → delivered
                    ↓
                cancelled / refunded
```

### Payment Methods

- `credit_card`
- `debit_card`
- `mobile_money`
- `bank_transfer`
- `cash`
- `paypal`

### Order Types

- `online`: Web/mobile orders
- `offline`: In-store purchases
- `phone`: Phone orders
- `wholesale`: Bulk orders

## Troubleshooting

### Authentication Errors

- **401 Unauthorized**: Token expired → Run "Refresh Sales Admin Token"
- **403 Forbidden**: Insufficient permissions → Check user role

### File Upload Issues

- Ensure `Content-Type` is set to `multipart/form-data`
- Max file size: 10MB
- Supported formats: jpg, jpeg, png, gif, webp

### Validation Errors

- Check required fields in request body
- Verify data types match schema
- Ensure referenced IDs exist (category, product, customer)

## Support

For issues or questions:

- Check server logs: `logs/combined.log`
- API Documentation: `http://localhost:5000/api`
- GitHub Issues: [Repository Issues](https://github.com/GiftChrisJava/els-backend/issues)
