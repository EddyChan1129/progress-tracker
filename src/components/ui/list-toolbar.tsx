"use client";

import { Search, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

export function ListToolbar({
  search,
  onSearch,
  category,
  onCategory,
  categories,
  placeholder,
}: {
  search: string;
  onSearch: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  categories: { id: string; name: string }[];
  placeholder: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      <div className="relative min-w-0 flex-1 basis-48">
        <Search
          aria-hidden
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label={placeholder}
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="pr-10 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {search ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="清除搜尋"
            onClick={() => onSearch("")}
            className="absolute top-1/2 right-0.5 -translate-y-1/2"
          >
            <X aria-hidden size={14} />
          </Button>
        ) : null}
      </div>
      <select
        aria-label="篩選分類"
        value={category}
        onChange={(event) => onCategory(event.target.value)}
        className="w-full sm:w-44"
      >
        <option value="">全部分類</option>
        {categories.map((item) => (
          <option value={item.id} key={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}
