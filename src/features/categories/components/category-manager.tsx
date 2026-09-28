"use client";

import { useState } from "react";

import { CategoryForm } from "@/features/categories/components/category-form";
import { CategoryList } from "@/features/categories/components/category-list";

export function CategoryManager() {
  const [listVersion, setListVersion] = useState(0);

  return (
    <>
      <CategoryForm onCreated={() => setListVersion((version) => version + 1)} />
      <CategoryList key={listVersion} />
    </>
  );
}
