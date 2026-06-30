import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import VideoPlayer from '@/components/ui/video';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentSection } from '@/components/video/CommentSection';
import { VideoCard } from '@/components/video/VideoCard';
import { getVideoById, incrementVideoViews, getVideos, deleteVideo, getCommentsByVideoId } from '@/db/api';
import type { Video, Comment } from '@/types';
import { Eye, Calendar, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Format view counts
function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadVideo();
      loadComments();
      loadRelatedVideos();
    }
  }, [id]);

  const loadVideo = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getVideoById(id);
      if (data) {
        setVideo(data);
        // Increment view count
        await incrementVideoViews(id);
      }
    } catch (error) {
      console.error('Failed to load video:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;
    try {
      const data = await getCommentsByVideoId(id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadRelatedVideos = async () => {
    try {
      const data = await getVideos({ page: 1, limit: 8 });
      setRelatedVideos(data);
    } catch (error) {
      console.error('Failed to load related videos:', error);
    }
  };

  const handleDelete = async () => {
    if (!video || !id) return;
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const success = await deleteVideo(id);
      if (success) {
        toast.success('Video deleted successfully');
        navigate('/');
      } else {
        toast.error('Failed to delete video');
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast.error('An error occurred while deleting the video');
    }
  };

  const canDelete = user && video && (user.id === video.uploader_id || profile?.role === 'admin');

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-6 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="aspect-video w-full bg-muted" />
              <Skeleton className="h-8 w-3/4 bg-muted" />
              <Skeleton className="h-20 w-full bg-muted" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Video not found</h1>
          <p className="text-muted-foreground mb-4">The video you are looking for does not exist</p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <VideoPlayer src={video.video_url} className="w-full h-full" />
            </div>

            {/* Video Information */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {formatViews(video.views)} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                    </span>
                    {video.category && (
                      <Badge variant="secondary">{video.category}</Badge>
                    )}
                  </div>
                </div>
                {canDelete && (
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>

              {/* Uploader Information */}
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                  {video.uploader?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{video.uploader?.username || 'Unknown User'}</p>
                  {video.uploader?.role === 'admin' && (
                    <Badge variant="secondary" className="mt-1">Admin</Badge>
                  )}
                </div>
              </div>

              {/* Video Description */}
              {video.description && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="whitespace-pre-wrap">{video.description}</p>
                </div>
              )}

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Section */}
            <CommentSection
              videoId={video.id}
              comments={comments}
              onCommentAdded={loadComments}
            />
          </div>

          {/* Sidebar - Related Videos */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Related Videos</h2>
            <div className="space-y-4">
              {relatedVideos
                .filter((v) => v.id !== video.id)
                .slice(0, 8)
                .map((relatedVideo) => (
                  <VideoCard key={relatedVideo.id} video={relatedVideo} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
