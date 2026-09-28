import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('slow-waltz');

export default function SlowWaltzPage() {
  return <CategoryPage slug="slow-waltz" />;
}
