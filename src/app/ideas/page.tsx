import { LibraryPage } from "@/components/library/library-page";

export const dynamic = "force-dynamic";

export default function IdeasPage() {
  return <LibraryPage filter="ideas" />;
}
