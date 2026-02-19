import { useState } from 'react';
import { Prompt } from '@/types/rufus';
import { VisibilityBadge } from './VisibilityBadge';
import { CoverageBadge } from './CoverageBadge';
import { PromptDetailPanel } from './PromptDetailPanel';
import { cn } from '@/lib/utils';
import { ChevronDown, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PromptRowProps {
  prompt: Prompt;
  index: number;
}

const volumeColors: Record<string, string> = {
  '5K+': 'bg-chart-discovery/10 text-chart-discovery',
  '2K+': 'bg-chart-evaluation/10 text-chart-evaluation',
  '1.2K+': 'bg-chart-conversion/10 text-chart-conversion',
  '<1K': 'bg-muted text-muted-foreground',
};

export function PromptRow({ prompt, index }: PromptRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editText, setEditText] = useState(prompt.text);

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all',
          'animate-slide-up',
          isExpanded && 'ring-1 ring-primary/20'
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Main row */}
        <div className="flex items-start">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                'mt-1 rounded-md p-1 text-muted-foreground transition-transform',
                isExpanded && 'rotate-180'
              )}>
                <ChevronDown className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {prompt.text}
                  </p>

                  {/* Volume badge */}
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0',
                    volumeColors[prompt.monthlyVolume]
                  )}>
                    {prompt.monthlyVolume}/mo
                  </span>
                </div>

                {/* Metrics row */}
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Visibility:</span>
                    <VisibilityBadge
                      outcome={prompt.visibilityOutcome}
                      score={prompt.visibilityScore}
                      competitor={prompt.topCompetitor}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Coverage:</span>
                    <CoverageBadge
                      status={prompt.coverage.status}
                      surfaces={prompt.coverage.surfaces}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* Kebab menu */}
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditText(prompt.text); setShowEdit(true); }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Expanded detail panel */}
        {isExpanded && (
          <div className="px-4 pb-4">
            <PromptDetailPanel prompt={prompt} />
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Prompt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this prompt? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setShowDelete(false)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Prompt Text</label>
              <Input value={editText} onChange={(e) => setEditText(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={() => setShowEdit(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
