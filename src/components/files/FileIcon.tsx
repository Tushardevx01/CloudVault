import React from "react";
import {
  FileText,
  FileImage,
  Film,
  Music,
  Archive,
  FileCode,
  FileQuestion,
  LucideProps,
} from "lucide-react";
import { FileCategory } from "@/types/file";

interface FileIconProps extends LucideProps {
  category: FileCategory;
  mimeType?: string;
  className?: string;
}

export function FileIcon({
  category,
  mimeType,
  className = "w-5 h-5",
  ...props
}: FileIconProps) {
  if (category === "image") {
    return <FileImage className={`${className} text-[#72C99A]`} {...props} />;
  }

  if (category === "document") {
    return <FileText className={`${className} text-[#78BCE8]`} {...props} />;
  }

  if (category === "media") {
    if (mimeType?.startsWith("audio/")) {
      return <Music className={`${className} text-[#4BAE79]`} {...props} />;
    }
    return <Film className={`${className} text-[#4BAE79]`} {...props} />;
  }

  if (category === "archive") {
    return <Archive className={`${className} text-[#3B9EE0]`} {...props} />;
  }

  if (category === "code") {
    return <FileCode className={`${className} text-[#20628E]`} {...props} />;
  }

  return <FileQuestion className={`${className} text-[#718096]`} {...props} />;
}
