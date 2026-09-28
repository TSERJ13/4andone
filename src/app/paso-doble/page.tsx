import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('paso-doble');

export default function PasoDoblePage() {
  return <CategoryPage slug="paso-doble" />;
}
