import { LibraryPage } from "@/components/library/library-page";

export const dynamic = "force-dynamic";

export default function ArchivePage() {
  return <LibraryPage filter="archive" />;
}
