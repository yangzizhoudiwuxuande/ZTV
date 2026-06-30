import { supabase } from './supabase';
import type { Video, Comment, Profile, VideoSearchParams, Subscription, SubscriptionPlan, Order } from '@/types';

// ==================== User Related APIs ====================

/**
 * Get current user profile
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }

  return data;
}

/**
 * Update user profile
 */
export async function updateProfile(id: string, updates: Partial<Profile>): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Update user profile failed:', error);
    return false;
  }

  return true;
}

/**
 * Get all users (Admin)
 */
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get user list:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==================== Membership & Payment Related APIs ====================

/**
 * Create payment order
 */
export async function createPaymentOrder(skuCode: string, userId: string, planType: SubscriptionPlan) {
  const { data, error } = await supabase.functions.invoke('create-payment-order', {
    body: { sku_code: skuCode, user_id: userId, plan_type: planType }
  });

  if (error) {
    const errorMsg = await error?.context?.text();
    console.error("Create payment order failed:", errorMsg || error?.message);
    throw new Error(errorMsg || "Create payment order failed");
  }

  return data as { order_no: string; code_url: string };
}

/**
 * Get order details
 */
export async function getOrderByNo(orderNo: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_no', orderNo)
    .maybeSingle();

  if (error) {
    console.error('Get order details failed:', error);
    return null;
  }

  return data;
}

/**
 * Upgrade membership (Backend trigger)
 */
export async function upgradeMembership(userId: string, plan: SubscriptionPlan): Promise<boolean> {
  const amount = plan === 'monthly' ? 7 : 72;

  const { data, error } = await supabase.rpc('upgrade_membership', {
    p_user_id: userId,
    p_plan: plan,
    p_amount: amount
  });

  if (error) {
    console.error('Failed to upgrade membership:', error);
    return false;
  }

  return data?.success || false;
}

/**
 * Get user subscription records
 */
export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get subscription records:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Check if membership is active
 */
export function isMembershipActive(profile: Profile | null): boolean {
  if (!profile || profile.membership !== 'premium') return false;
  if (!profile.membership_expires_at) return false;
  
  const expiresAt = new Date(profile.membership_expires_at);
  return expiresAt > new Date();
}

// ==================== Video Related APIs ====================

/**
 * Get video list (Search & Pagination)
 */
export async function getVideos(params: VideoSearchParams): Promise<Video[]> {
  const { page = 1, limit = 12, search, category, uploader_id } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('videos')
    .select(`
      *,
      uploader:public_profiles!videos_uploader_id_fkey(id, username, avatar_url, role)
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (uploader_id) {
    query = query.eq('uploader_id', uploader_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get video list:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get video by ID
 */
export async function getVideoById(id: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      uploader:public_profiles!videos_uploader_id_fkey(id, username, avatar_url, role)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to get video details:', error);
    return null;
  }

  return data;
}

/**
 * Increment video views
 */
export async function incrementVideoViews(videoId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_video_views', { video_id: videoId });

  if (error) {
    console.error('Failed to increment views:', error);
  }
}

/**
 * Upload video to Storage
 */
export async function uploadVideoFile(userId: string, file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('300044_videos')
    .upload(fileName, file);

  if (error) {
    console.error('Failed to upload video file:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('300044_videos')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Upload thumbnail to Storage
 */
export async function uploadThumbnail(userId: string, file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('300044_thumbnails')
    .upload(fileName, file);

  if (error) {
    console.error('Failed to upload thumbnail:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('300044_thumbnails')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Create video record
 */
export async function createVideo(videoData: Omit<Video, 'id' | 'views' | 'created_at' | 'updated_at'>): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .insert(videoData)
    .select(`
      *,
      uploader:public_profiles!videos_uploader_id_fkey(id, username, avatar_url, role)
    `)
    .maybeSingle();

  if (error) {
    console.error('Create video record failed:', error);
    return null;
  }

  return data;
}

/**
 * Delete video
 */
export async function deleteVideo(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete video failed:', error);
    return false;
  }

  return true;
}

// ==================== Comment Related APIs ====================

/**
 * Get comments for video
 */
export async function getCommentsByVideoId(videoId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:public_profiles!comments_user_id_fkey(id, username, avatar_url, role)
    `)
    .eq('video_id', videoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get comments:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Create comment
 */
export async function createComment(videoId: string, userId: string, content: string): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ video_id: videoId, user_id: userId, content })
    .select(`
      *,
      user:public_profiles!comments_user_id_fkey(id, username, avatar_url, role)
    `)
    .maybeSingle();

  if (error) {
    console.error('Create comment failed:', error);
    return null;
  }

  return data;
}

/**
 * Delete comment
 */
export async function deleteComment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete comment failed:', error);
    return false;
  }

  return true;
}
