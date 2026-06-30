import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '@/types';
import { createComment, deleteComment } from '@/db/api';
import { toast } from 'sonner';

interface CommentSectionProps {
  videoId: string;
  comments: Comment[];
  onCommentAdded: () => void;
}

export function CommentSection({ videoId, comments, onCommentAdded }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createComment(videoId, user.id, content.trim());
      if (result) {
        setContent('');
        onCommentAdded();
        toast.success('Comment posted successfully');
      } else {
        toast.error('Failed to post comment');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const success = await deleteComment(commentId);
      if (success) {
        onCommentAdded();
        toast.success('Comment deleted successfully');
      } else {
        toast.error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{comments.length} Comments</h2>

      {/* Comment input box */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username} />
              <AvatarFallback>{profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setContent('')}
                  disabled={!content.trim() || isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!content.trim() || isSubmitting}>
                  {isSubmitting ? 'Posting...' : 'Comment'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            Please sign in to leave a comment
          </CardContent>
        </Card>
      )}

      {/* Comment list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={comment.user?.avatar_url || ''} alt={comment.user?.username || 'User'} />
              <AvatarFallback>{comment.user?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{comment.user?.username || 'Unknown'}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              {(user?.id === comment.user_id || profile?.role === 'admin') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No comments yet. Be the first to comment!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
