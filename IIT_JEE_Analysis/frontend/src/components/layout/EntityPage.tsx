/**
 * Generic CRUD page for simple entities (Branch, Program, Class, Section).
 * Renders a searchable table with create/edit dialogs.
 */
import { useState, ReactNode } from "react";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface EntityPageProps<T extends { id: number }> {
  title: string;
  subtitle?: string;
  items: T[];
  columns: Column<T>[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  searchPlaceholder?: string;
  searchFilter?: (item: T, q: string) => boolean;
  dialog: ReactNode;
}

export function EntityPage<T extends { id: number }>({
  title,
  subtitle,
  items,
  columns,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  searchPlaceholder = "Search…",
  searchFilter,
  dialog,
}: EntityPageProps<T>) {
  const [search, setSearch] = useState("");

  const filtered = searchFilter
    ? items.filter((item) => searchFilter(item, search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add {title.replace(" Management", "").split(" ")[0]}
        </Button>
      </div>

      {searchFilter && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-medium text-muted-foreground">No records found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Click "Add" to create a new entry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {columns.map((col) => (
                      <th key={String(col.key)} className="text-left px-6 py-3 font-semibold text-muted-foreground">
                        {col.label}
                      </th>
                    ))}
                    <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {columns.map((col) => (
                        <td key={String(col.key)} className="px-6 py-4">
                          {col.render
                            ? col.render(item)
                            : String((item as Record<string, unknown>)[String(col.key)] ?? "")}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {dialog}
    </div>
  );
}
