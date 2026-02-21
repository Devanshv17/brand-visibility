import { useState, useMemo } from 'react';
import { useTopics } from '@/hooks/useTopics';
import { usePrompts } from '@/hooks/usePrompts';
import { Platform, Topic } from '@/types/rufus';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown, ChevronRight, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVolume } from '@/lib/volumeEstimator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface TopicsViewProps {
  platform: Platform;
}

type SortField = 'volume' | 'visibility';

export function TopicsView({ platform }: TopicsViewProps) {
  const { topics, isLoading: topicsLoading } = useTopics();
  const { prompts, isLoading: promptsLoading } = usePrompts();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const topicStats = useMemo(() => {
    return topics.map((topic) => {
      const topicPrompts = prompts.filter((p) => topic.promptIds.includes(p.id));
      const totalVolume = topicPrompts.reduce((sum, p) => sum + p.monthlyVolume, 0);
      const avgVisibility = topicPrompts.length > 0
        ? Math.round(topicPrompts.reduce((sum, p) => sum + p.visibilityScore, 0) / topicPrompts.length)
        : 0;
      return { ...topic, totalVolume, avgVisibility, promptCount: topicPrompts.length };
    });
  }, [topics, prompts]);

  const filtered = useMemo(() => {
    let result = topicStats;
    if (searchQuery) {
      result = result.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    result.sort((a, b) => {
      const field = sortField === 'volume' ? 'totalVolume' : 'avgVisibility';
      return sortAsc ? a[field] - b[field] : b[field] - a[field];
    });
    return result;
  }, [topicStats, searchQuery, sortField, sortAsc]);

  const selectedTopicPrompts = useMemo(() => {
    if (!selectedTopic) return [];
    return prompts.filter((p) => selectedTopic.promptIds.includes(p.id));
  }, [selectedTopic, prompts]);

  // formatVolume is now imported from @/lib/volumeEstimator

  if (topicsLoading || promptsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={sortField === 'volume' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setSortField('volume'); setSortAsc((v) => sortField === 'volume' ? !v : false); }}
            className="gap-1.5 text-xs"
          >
            <ArrowUpDown className="h-3 w-3" />
            Volume
          </Button>
          <Button
            variant={sortField === 'visibility' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setSortField('visibility'); setSortAsc((v) => sortField === 'visibility' ? !v : false); }}
            className="gap-1.5 text-xs"
          >
            <ArrowUpDown className="h-3 w-3" />
            Visibility
          </Button>
        </div>
      </div>

      {/* Topic cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((topic, index) => (
          <button
            key={topic.id}
            onClick={() => setSelectedTopic(topic)}
            className={cn(
              'group rounded-xl border border-border bg-card p-4 text-left shadow-card transition-all hover:shadow-elevated hover:border-primary/20',
              'animate-slide-up'
            )}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-foreground">{topic.name}</h3>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>

            <div className="space-y-3">
              {/* Volume */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Monthly Volume</span>
                <span className="font-semibold text-foreground">{formatVolume(topic.totalVolume)}</span>
              </div>

              {/* Visibility bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Visibility</span>
                  <span className="font-semibold text-foreground">{topic.avgVisibility}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      topic.avgVisibility >= 70 ? 'bg-brand-win' : topic.avgVisibility >= 50 ? 'bg-warning' : 'bg-competitor-win'
                    )}
                    style={{ width: `${topic.avgVisibility}%` }}
                  />
                </div>
              </div>

              {/* Prompt count */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Prompts</span>
                <span className="text-foreground">{topic.promptCount}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No topics match your search.</p>
        </div>
      )}

      {/* Topic detail drawer */}
      <Sheet open={!!selectedTopic} onOpenChange={(v) => !v && setSelectedTopic(null)}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto">
          {selectedTopic && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTopic.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Monthly Volume</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatVolume(
                        selectedTopicPrompts.reduce((s, p) => s + p.monthlyVolume, 0)
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Avg Visibility</p>
                    <p className="text-lg font-bold text-foreground">
                      {selectedTopicPrompts.length
                        ? Math.round(selectedTopicPrompts.reduce((s, p) => s + p.visibilityScore, 0) / selectedTopicPrompts.length)
                        : 0}%
                    </p>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-foreground mt-4">Prompts in this topic</h4>
                <div className="space-y-2">
                  {selectedTopicPrompts.map((prompt) => (
                    <div key={prompt.id} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm text-foreground mb-2">{prompt.text}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className={cn(
                          'font-medium',
                          prompt.visibilityScore >= 70 ? 'text-brand-win' : prompt.visibilityScore >= 50 ? 'text-warning' : 'text-competitor-win'
                        )}>
                          {prompt.visibilityScore}/100
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5">{formatVolume(prompt.monthlyVolume)}/mo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
