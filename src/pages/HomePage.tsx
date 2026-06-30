import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VideoCard } from '@/components/video/VideoCard';
import { MembershipCard } from '@/components/membership/MembershipCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getVideos } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Video, VideoCategory } from '@/types';

const categories: { value: VideoCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'music', label: 'Music' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'technology', label: 'Technology' },
  { value: 'news', label: 'News' },
  { value: 'other', label: 'Other' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = (searchParams.get('category') || 'all') as VideoCategory | 'all';

  useEffect(() => {
    loadVideos(true);
  }, [searchQuery, categoryFilter]);

  const loadVideos = async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 1 : page;

    try {
      const params: any = {
        page: currentPage,
        limit: 12,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }

      const data = await getVideos(params);

      if (reset) {
        setVideos(data);
        setPage(1);
      } else {
        setVideos((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === 12);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', value);
    }
    setSearchParams(newParams);
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
    loadVideos(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 px-4">
        {/* Membership Card */}
        {user && (
          <div className="mb-6">
            <MembershipCard />
          </div>
        )}

        {/* Categories */}
        <div className="mb-6 overflow-x-auto">
          <Tabs value={categoryFilter} onValueChange={handleCategoryChange}>
            <TabsList className="inline-flex w-auto">
              {categories.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Search result hint */}
        {searchQuery && (
          <div className="mb-4">
            <p className="text-muted-foreground">
              Search results for: <span className="font-semibold text-foreground">{searchQuery}</span>
            </p>
          </div>
        )}

        {/* Video Grid */}
        {loading && videos.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full bg-muted" />
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full bg-muted" />
                    <Skeleton className="h-3 w-2/3 bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : videos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button onClick={handleLoadMore} disabled={loading} variant="outline" size="lg">
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No videos found</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
