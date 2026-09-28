import { generateCategoryMetadata, CategoryPage } from '@/components/category/CategoryPageTemplate';

export const generateMetadata = () => generateCategoryMetadata('cha-cha-cha');

export default function ChaChaChaPage() {
  return <CategoryPage slug="cha-cha-cha" />;
}
