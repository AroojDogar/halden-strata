"use client";

import { useEffect } from "react";
import { mountAll } from "@/lib/fx";

/**
 * The only client component on the page.
 * The sections are server-rendered HTML with data-fx attributes;
 * this component wakes them up in the browser and cleans up on unmount.
 */
export default function Effects() {
  useEffect(() => mountAll(document), []);
  return null;
}
