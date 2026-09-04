"use client";

import { useState } from "react";
import Image from "next/image";
import { Globe2 } from "lucide-react";

/** Drapeau (flagcdn.com) avec repli discret sur une icône générique si l'image ne charge pas. */
export function NationalityFlag({ url, name, size = 24 }: { url: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return <Globe2 size={size * 0.7} className="shrink-0 text-rf-fg-subtle" aria-hidden />;
  }

  return (
    <Image
      src={url}
      alt={name}
      width={size}
      height={size * 0.75}
      className="shrink-0 rounded-sm object-cover"
      style={{ width: size, height: size * 0.75 }}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
