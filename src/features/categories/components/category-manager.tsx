"use client";

import { useState } from "react";

import { CategoryForm } from "@/features/categories/components/category-form";
import { CategoryList } from "@/features/categories/components/category-list";

export function CategoryManager() {
  const [listVersion, setListVersion] = useState(0);

  return (
    <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0 border-b pb-6 lg:border-r lg:border-b-0 lg:pr-8">
        <CategoryForm
          onCreated={() => setListVersion((version) => version + 1)}
        />
      </div>
      <CategoryList key={listVersion} />
    </div>
  );
}
