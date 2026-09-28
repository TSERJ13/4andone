import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('samba');

export default function SambaPage() {
  return <CategoryPage slug="samba" />;
}
