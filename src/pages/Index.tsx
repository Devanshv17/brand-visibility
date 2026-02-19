import { useState } from 'react';
import { Platform } from '@/types/rufus';
import { mockPrompts, mockRollupMetrics, brandName, topCompetitors, topCitationSources } from '@/data/mockData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PromptRow } from '@/components/dashboard/PromptRow';
import { CompetitorCard } from '@/components/dashboard/CompetitorCard';
import { CitationSourceCard } from '@/components/dashboard/CitationSourceCard';
import { PlatformSelector } from '@/components/dashboard/PlatformSelector';
import { VisibilityTrendChart } from '@/components/dashboard/VisibilityTrendChart';
import { TopicsView } from '@/components/dashboard/TopicsView';
import { AddModal } from '@/components/dashboard/AddModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, BarChart3, LayoutDashboard, MessageSquare, FolderOpen, Plus, TrendingUp, TrendingDown } from 'lucide-react';

const Index = () => {
  const [platform, setPlatform] = useState<Platform>('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'topics' | 'prompts'>('prompts');

  const openAdd = (mode: 'topics' | 'prompts') => {
    setAddMode(mode);
    setAddModalOpen(true);
  };

  const trendDelta = mockRollupMetrics.trendDelta;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-visibility">
                <BarChart3 className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Visibility Monitor</h1>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{brandName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PlatformSelector value={platform} onChange={setPlatform} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openAdd('topics')}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Add Topics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openAdd('prompts')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Prompts / Questions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Prompts
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Main KPI + Trend */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    Overall Visibility Score
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-foreground">
                      {mockRollupMetrics.overallVisibilityScore}
                    </span>
                    <span className="text-lg text-muted-foreground">/100</span>
                    <div className={`flex items-center gap-1 ml-2 text-sm font-medium ${trendDelta >= 0 ? 'text-brand-win' : 'text-competitor-win'}`}>
                      {trendDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {trendDelta >= 0 ? '+' : ''}{trendDelta} vs last month
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Priority-weighted across all prompts</p>
                </div>
              </div>
              <VisibilityTrendChart data={mockRollupMetrics.visibilityTrend} />
            </div>

            {/* Competitors & Citations */}
            <section className="grid gap-6 md:grid-cols-2">
              <CompetitorCard competitors={topCompetitors} />
              <CitationSourceCard sources={topCitationSources} />
            </section>
          </TabsContent>

          {/* Topics Tab */}
          <TabsContent value="topics">
            <TopicsView platform={platform} />
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Prompt Library
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({mockPrompts.length} prompts)
                </span>
              </h2>
            </div>

            <div className="space-y-3">
              {mockPrompts.map((prompt, index) => (
                <PromptRow key={prompt.id} prompt={prompt} index={index} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <AddModal open={addModalOpen} onOpenChange={setAddModalOpen} mode={addMode} />
    </div>
  );
};

export default Index;
