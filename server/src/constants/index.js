export const ROLES = {
  BUYER: 'buyer',
  VENDOR: 'vendor',
  ADMIN: 'admin',
};

export const VENDOR_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PARTIALLY_SHIPPED: 'partially_shipped',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const SUB_ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const NOTIFICATION_TYPES = {
  ORDER_STATUS_UPDATED: 'order_status_updated',
  ORDER_PLACED: 'order_placed',
  VENDOR_NEW_ORDER: 'vendor_new_order',
  PRICE_DROP: 'price_drop',
  VENDOR_APPROVAL: 'vendor_approval',
  LOW_STOCK: 'low_stock',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
};
