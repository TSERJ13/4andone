import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('tango');

export default function TangoPage() {
  return <CategoryPage slug="tango" />;
}
