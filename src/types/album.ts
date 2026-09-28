export interface Album {
  id: string;
  slug: string;
  title: string;
  artist: string;
  subtitle: string;
  description?: string;
  badge: string;
  coverUrl: string;
  themeColor: string;
  secondaryColor?: string;
  gradient?: string;
  program: 'Latin' | 'Standard' | 'Both';
  allowedStyles: string[];
  tags: string[];
  orderIndex: number;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
