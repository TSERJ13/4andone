import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('slow-foxtrot');

export default function SlowFoxtrotPage() {
  return <CategoryPage slug="slow-foxtrot" />;
}
