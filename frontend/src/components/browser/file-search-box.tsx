'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, X } from 'lucide-react';
import { searchFiles } from '@/lib/api/files';
import { formatBytes } from '@/lib/format';
import { Input } from '@/components/ui/input';

interface FileSearchBoxProps {
  dataRoomId: string;
}

/** File-name search across the whole Data Room, not just the current folder. */
export function FileSearchBox({ dataRoomId }: FileSearchBoxProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ['file-search', dataRoomId, debounced],
    queryFn: () => searchFiles(dataRoomId, debounced),
    enabled: debounced.length > 0,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goTo(fileId: string) {
    setOpen(false);
    setQuery('');
    router.push(`/rooms/${dataRoomId}/files/${fileId}`);
  }

  const showPanel = open && debounced.length > 0;

  return (
    <div ref={containerRef} className="relative w-full sm:w-64">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          placeholder="Search files…"
          className="h-8 pl-8"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-md border bg-popover shadow-md">
          {isFetching && <div className="p-3 text-sm text-muted-foreground">Searching…</div>}
          {!isFetching && data && data.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              No files match &ldquo;{debounced}&rdquo;.
            </div>
          )}
          {!isFetching && data && data.length > 0 && (
            <ul className="max-h-72 overflow-y-auto py-1">
              {data.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                    onClick={() => goTo(file.id)}
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{file.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {file.folderPath} · {formatBytes(file.sizeBytes)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}