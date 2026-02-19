import { useState } from 'react';
import { Platform } from '@/types/rufus';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

interface PlatformSelectorProps {
  value: Platform;
  onChange: (platform: Platform) => void;
}

const platforms: Platform[] = ['All', 'Rufus', 'ChatGPT', 'Perplexity'];

export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={(v) => onChange(v as Platform)}>
        <SelectTrigger className="w-[140px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {platforms.map((p) => (
            <SelectItem key={p} value={p}>
              {p === 'All' ? 'All Platforms' : p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
