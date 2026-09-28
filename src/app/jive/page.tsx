import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('jive');

export default function JivePage() {
  return <CategoryPage slug="jive" />;
}
