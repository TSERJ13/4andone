import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('viennese-waltz');

export default function VienneseWaltzPage() {
  return <CategoryPage slug="viennese-waltz" />;
}
