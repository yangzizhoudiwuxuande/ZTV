import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { uploadVideoFile, uploadThumbnail, createVideo } from '@/db/api';
import { toast } from 'sonner';
import { Upload, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';
import type { VideoCategory } from '@/types';

const categories: { value: VideoCategory; label: string }[] = [
  { value: 'music', label: 'Music' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'technology', label: 'Technology' },
  { value: 'news', label: 'News' },
  { value: 'other', label: 'Other' },
];

// Compress image
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Limit max resolution to 1080p
        const maxWidth = 1920;
        const maxHeight = 1080;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // 转换为WebP格式，质量0.8
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                type: 'image/webp',
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as VideoCategory,
    tags: '',
  });

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size（500MB限制）
      if (file.size > 500 * 1024 * 1024) {
        toast.error('Video file size must be less than 500MB');
        return;
      }
      setVideoFile(file);
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size
      if (file.size > 1024 * 1024) {
        // 超过1MB，自动压缩
        try {
          const compressed = await compressImage(file);
          setThumbnailFile(compressed);
          toast.success(`Thumbnail compressed to ${(compressed.size / 1024).toFixed(0)}KB`);
        } catch (error) {
          console.error('Compression failed:', error);
          toast.error('Failed to compress thumbnail');
        }
      } else {
        setThumbnailFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload video file
      setUploadProgress(20);
      const videoUrl = await uploadVideoFile(user.id, videoFile);
      if (!videoUrl) {
        throw new Error('Video upload failed');
      }

      // Upload thumbnail（如果有）
      setUploadProgress(50);
      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        thumbnailUrl = await uploadThumbnail(user.id, thumbnailFile);
      }

      // Create video record
      setUploadProgress(80);
      const tags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const video = await createVideo({
        title: formData.title,
        description: formData.description || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        category: formData.category,
        tags,
        duration: null,
        uploader_id: user.id,
      });

      if (!video) {
        throw new Error('Failed to create video record');
      }

      setUploadProgress(100);
      toast.success('Video uploaded successfully!');
      navigate(`/video/${video.id}`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('An error occurred during upload');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Upload Video</CardTitle>
            <CardDescription>Share your content with the world</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 视频文件上传 */}
              <div className="space-y-2">
                <Label htmlFor="video">Video File *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    id="video"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleVideoChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <label htmlFor="video" className="cursor-pointer">
                    <VideoIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    {videoFile ? (
                      <p className="text-sm font-medium">{videoFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium mb-1">Click to upload video</p>
                        <p className="text-xs text-muted-foreground">Support MP4, WebM, OGG (Max 500MB)</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* 缩略图上传 */}
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail (Optional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    id="thumbnail"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleThumbnailChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <label htmlFor="thumbnail" className="cursor-pointer">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    {thumbnailFile ? (
                      <p className="text-sm font-medium">{thumbnailFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium mb-1">Click to upload thumbnail</p>
                        <p className="text-xs text-muted-foreground">Support images (Max 1MB, auto-compressed)</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter video title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={isUploading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell viewers about your video"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px]"
                  disabled={isUploading}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as VideoCategory })}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas (e.g., music, rock, live)"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  disabled={isUploading}
                />
              </div>

              {/* Upload progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Submit button */}
              <div className="flex gap-4">
                <Button type="submit" disabled={!videoFile || !formData.title || isUploading} className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Publish Video'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
