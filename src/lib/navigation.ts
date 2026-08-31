import {
  Archive,
  FileText,
  Library,
  Lightbulb,
  type LucideIcon,
  Send,
} from "lucide-react";

export type LibraryDestination = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const libraryDestinations: LibraryDestination[] = [
  { label: "Library", href: "/", icon: Library },
  { label: "Drafts", href: "/drafts", icon: FileText },
  { label: "Ideas", href: "/ideas", icon: Lightbulb },
  { label: "Published", href: "/published", icon: Send },
  { label: "Archive", href: "/archive", icon: Archive },
];
