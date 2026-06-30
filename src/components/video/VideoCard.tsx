import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Video } from '@/types';
import { Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VideoCardProps {
  video: Video;
}

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

// Format video duration
function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Category tag color mapping
const categoryColors: Record<string, string> = {
  music: 'bg-purple-500',
  gaming: 'bg-green-500',
  education: 'bg-blue-500',
  entertainment: 'bg-pink-500',
  sports: 'bg-orange-500',
  technology: 'bg-cyan-500',
  news: 'bg-red-500',
  other: 'bg-gray-500',
};

export function VideoCard({ video }: VideoCardProps) {
  return (
    <Link to={`/video/${video.id}`} className="group">
      <Card className="overflow-hidden border-0 shadow-none hover:shadow-lg transition-shadow">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-4xl text-muted-foreground">🎬</span>
            </div>
          )}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Uploader avatar */}
            <div className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                {video.uploader?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>

            {/* Video Information */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground mb-1">
                {video.uploader?.username || 'Unknown User'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatViews(video.views)} views
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                </span>
              </div>
              {video.category && (
                <Badge
                  variant="secondary"
                  className={`mt-2 text-xs ${categoryColors[video.category] || categoryColors.other} text-white`}
                >
                  {video.category}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
