import {
  Archive,
  FileText,
  Library,
  Lightbulb,
  type LucideIcon,
  Send,
} from "lucide-react";
import type { Route } from "next";

import type { LibraryFilter } from "@/articles/model";

export type LibraryDestination = {
  label: string;
  href: Route;
  icon: LucideIcon;
  filter: LibraryFilter;
};

export const libraryDestinations: LibraryDestination[] = [
  { label: "Library", href: "/", icon: Library, filter: "all" },
  { label: "Drafts", href: "/drafts" as Route, icon: FileText, filter: "drafts" },
  { label: "Ideas", href: "/ideas" as Route, icon: Lightbulb, filter: "ideas" },
  {
    label: "Published",
    href: "/published" as Route,
    icon: Send,
    filter: "published",
  },
  { label: "Archive", href: "/archive" as Route, icon: Archive, filter: "archive" },
];
