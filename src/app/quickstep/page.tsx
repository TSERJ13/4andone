import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('quickstep');

export default function QuickstepPage() {
  return <CategoryPage slug="quickstep" />;
}
