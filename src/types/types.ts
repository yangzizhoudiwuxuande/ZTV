// 用户角色类型
export type UserRole = 'user' | 'admin';

// 会员类型
export type MembershipType = 'free' | 'premium';

// 订阅计划类型
export type SubscriptionPlan = 'monthly' | 'yearly';

// 视频分类类型
export type VideoCategory = 'music' | 'gaming' | 'education' | 'entertainment' | 'sports' | 'technology' | 'news' | 'other';

// 用户资料接口
export interface Profile {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  membership: MembershipType;
  membership_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// 公开用户资料接口
export interface PublicProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  role: UserRole;
}

// 订单状态
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

// 订单接口
export interface Order {
  id: string;
  order_no: string;
  user_id: string;
  status: OrderStatus;
  wechat_pay_url: string | null;
  total_amount: number;
  sku_code: string;
  plan_type: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

// SKU 接口
export interface SKU {
  id: string;
  sku_code: string;
  name: string;
  price: number;
  inventory_total: number;
  inventory_available: number;
  inventory_reserved: number;
  inventory_sold: number;
  created_at: string;
}

// 订阅记录接口
export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  amount: number;
  status: string;
  started_at: string;
  expires_at: string;
  created_at: string;
}

// 视频接口
export interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: VideoCategory;
  tags: string[];
  duration: number | null;
  views: number;
  uploader_id: string;
  created_at: string;
  updated_at: string;
  uploader?: PublicProfile; // 关联的上传者信息
}

// 评论接口
export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: PublicProfile; // 关联的用户信息
}

// 视频上传表单数据
export interface VideoUploadData {
  title: string;
  description?: string;
  category: VideoCategory;
  tags?: string[];
  video_file: File;
  thumbnail_file?: File;
}

// 分页参数
export interface PaginationParams {
  page: number;
  limit: number;
}

// 视频搜索参数
export interface VideoSearchParams extends PaginationParams {
  search?: string;
  category?: VideoCategory;
  uploader_id?: string;
}
