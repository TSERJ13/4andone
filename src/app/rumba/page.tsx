import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('rumba');

export default function RumbaPage() {
  return <CategoryPage slug="rumba" />;
}
