import { useState } from 'react';
import { Persona, MonthlyVolume } from '@/types/rufus';
import { mockTopics, personas } from '@/data/mockData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'topics' | 'prompts';
}

const volumeBuckets: MonthlyVolume[] = ['5K+', '2K+', '1.2K+', '<1K'];

export function AddModal({ open, onOpenChange, mode }: AddModalProps) {
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [newPersona, setNewPersona] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [showNewPersona, setShowNewPersona] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [customPersonas, setCustomPersonas] = useState<string[]>([]);
  const [customTopics, setCustomTopics] = useState<{ id: string; name: string }[]>([]);
  const [generatedPrompts, setGeneratedPrompts] = useState<{ text: string; selected: boolean }[]>([]);
  const [step, setStep] = useState<'configure' | 'preview'>('configure');

  const allPersonas = [...personas, ...customPersonas];
  const allTopics = [...mockTopics, ...customTopics];

  const handleAddPersona = () => {
    if (newPersona.trim()) {
      setCustomPersonas((prev) => [...prev, newPersona.trim()]);
      setSelectedPersona(newPersona.trim());
      setNewPersona('');
      setShowNewPersona(false);
    }
  };

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      const id = `custom-${Date.now()}`;
      setCustomTopics((prev) => [...prev, { id, name: newTopic.trim() }]);
      setSelectedTopicIds((prev) => [...prev, id]);
      setNewTopic('');
      setShowNewTopic(false);
    }
  };

  const toggleTopic = (id: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    // Mock generated prompts
    const mockGenerated = [
      { text: `What is the best product for ${selectedPersona || 'customers'}?`, selected: true },
      { text: `How does this compare to competitors in ${allTopics.find(t => selectedTopicIds.includes(t.id))?.name || 'this category'}?`, selected: true },
      { text: `Is this product worth the price?`, selected: true },
      { text: `What do other customers say about this?`, selected: true },
    ];
    setGeneratedPrompts(mockGenerated);
    setStep('preview');
  };

  const handleSave = () => {
    // In a real app, save to state/backend
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setSelectedPersona('');
    setSelectedTopicIds([]);
    setGeneratedPrompts([]);
    setStep('configure');
    setShowNewPersona(false);
    setShowNewTopic(false);
  };

  const topicDisplayText = () => {
    if (selectedTopicIds.length === 0) return 'Select topics';
    if (selectedTopicIds.length === 1) return allTopics.find((t) => t.id === selectedTopicIds[0])?.name;
    return `${selectedTopicIds.length} topics selected`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'topics' ? 'Add Topics' : 'Add Prompts / Questions'}
          </DialogTitle>
        </DialogHeader>

        {step === 'configure' && (
          <div className="space-y-5 pt-2">
            {/* Persona */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Persona</Label>
              {!showNewPersona ? (
                <div className="flex gap-2">
                  <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPersonas.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setShowNewPersona(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="New persona name"
                    value={newPersona}
                    onChange={(e) => setNewPersona(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPersona()}
                  />
                  <Button size="sm" onClick={handleAddPersona}>Add</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewPersona(false)}>Cancel</Button>
                </div>
              )}
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Topics</Label>
              {!showNewTopic ? (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-between text-sm font-normal">
                        {topicDisplayText()}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-2" align="start">
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {allTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                            onClick={() => toggleTopic(topic.id)}
                          >
                            <Checkbox checked={selectedTopicIds.includes(topic.id)} className="h-4 w-4" />
                            <span className="text-sm">{topic.name}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="sm" onClick={() => setShowNewTopic(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="New topic name"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                  />
                  <Button size="sm" onClick={handleAddTopic}>Add</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewTopic(false)}>Cancel</Button>
                </div>
              )}
            </div>

            {mode === 'prompts' && (
              <Button onClick={handleGenerate} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Prompts
              </Button>
            )}

            {mode === 'topics' && (
              <Button onClick={handleSave} className="w-full" disabled={selectedTopicIds.length === 0 && !newTopic}>
                Save Topics
              </Button>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Review generated prompts and deselect any you don't want to save.</p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {generatedPrompts.map((prompt, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border border-border p-3 transition-colors',
                    prompt.selected ? 'bg-card' : 'bg-muted/50 opacity-60'
                  )}
                >
                  <Checkbox
                    checked={prompt.selected}
                    onCheckedChange={(checked) => {
                      setGeneratedPrompts((prev) =>
                        prev.map((p, idx) => idx === i ? { ...p, selected: !!checked } : p)
                      );
                    }}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground">{prompt.text}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('configure')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Save {generatedPrompts.filter((p) => p.selected).length} Prompts
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
