import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Home, Users, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { globalSearch } from "@/api/search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const onSelect = (path: string) => {
    setOpen(false);
    navigate({ to: path as any });
  };

  return (
    <>
      <div 
        className="relative hidden max-w-md flex-1 md:block cursor-text"
        onClick={() => setOpen(true)}
      >
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background pr-10 pl-3 text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
          <span>بحث شامل: عقار، وحدة، عقد، مستأجر...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput 
          placeholder="ابحث هنا..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">جاري البحث...</div>}
          {!isLoading && query.length > 0 && !data?.units.length && !data?.tenants.length && !data?.contracts.length && (
            <CommandEmpty>لا توجد نتائج مطابقة.</CommandEmpty>
          )}

          {data?.units && data.units.length > 0 && (
            <CommandGroup heading="العقارات والوحدات">
              {data.units.map(unit => (
                <CommandItem key={unit.id} onSelect={() => onSelect(`/units/${unit.id}`)}>
                  <Home className="ml-2 h-4 w-4" />
                  <span>{unit.title}</span>
                  {unit.number && <span className="mr-2 text-muted-foreground">({unit.number})</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {data?.tenants && data.tenants.length > 0 && (
            <CommandGroup heading="المستأجرين">
              {data.tenants.map(tenant => (
                <CommandItem key={tenant.id} onSelect={() => onSelect(`/tenants/${tenant.id}`)}>
                  <Users className="ml-2 h-4 w-4" />
                  <span>{tenant.full_name}</span>
                  {tenant.phone && <span className="mr-2 text-muted-foreground">{tenant.phone}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {data?.contracts && data.contracts.length > 0 && (
            <CommandGroup heading="العقود">
              {data.contracts.map(contract => (
                <CommandItem key={contract.id} onSelect={() => onSelect(`/contracts/${contract.id}`)}>
                  <FileText className="ml-2 h-4 w-4" />
                  <span>عقد #{contract.number || 'بدون رقم'}</span>
                  {contract.units?.title && <span className="mr-2 text-muted-foreground">({contract.units.title})</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
