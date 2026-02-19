import { JourneyStage, Priority, Persona } from '@/types/rufus';
import { cn } from '@/lib/utils';
import { personas } from '@/data/mockData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';

interface FilterBarProps {
  selectedStages: JourneyStage[];
  selectedPriorities: Priority[];
  selectedPersonas: Persona[];
  onStageToggle: (stage: JourneyStage) => void;
  onPriorityToggle: (priority: Priority) => void;
  onPersonaToggle: (persona: Persona) => void;
}

const stages: JourneyStage[] = ['Discovery', 'Evaluation', 'Conversion'];
const priorities: Priority[] = ['High', 'Medium', 'Low'];

const stageColors: Record<JourneyStage, string> = {
  Discovery: 'bg-surface-pdp/10 text-surface-pdp border-surface-pdp/30 hover:bg-surface-pdp/20',
  Evaluation: 'bg-surface-store/10 text-surface-store border-surface-store/30 hover:bg-surface-store/20',
  Conversion: 'bg-success/10 text-success border-success/30 hover:bg-success/20',
};

const priorityColors: Record<Priority, string> = {
  High: 'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20',
  Medium: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20',
  Low: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
};

export function FilterBar({
  selectedStages,
  selectedPriorities,
  selectedPersonas,
  onStageToggle,
  onPriorityToggle,
  onPersonaToggle,
}: FilterBarProps) {
  const getPersonaDisplayText = () => {
    if (selectedPersonas.length === 0) return 'All';
    if (selectedPersonas.length === 1) return selectedPersonas[0];
    return `${selectedPersonas.length} selected`;
  };

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* Persona Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Persona:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[180px] justify-between text-xs font-medium"
            >
              {getPersonaDisplayText()}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2 bg-popover" align="start">
            <div className="space-y-1">
              {personas.map((persona) => {
                const isSelected = selectedPersonas.includes(persona);
                return (
                  <div
                    key={persona}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                    onClick={() => onPersonaToggle(persona)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{persona}</span>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Journey Stage Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Stage:</span>
        <div className="flex gap-1.5">
          {stages.map((stage) => {
            const isSelected = selectedStages.includes(stage);
            return (
              <button
                key={stage}
                onClick={() => onStageToggle(stage)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  isSelected
                    ? stageColors[stage]
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                {stage}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Priority:</span>
        <div className="flex gap-1.5">
          {priorities.map((priority) => {
            const isSelected = selectedPriorities.includes(priority);
            return (
              <button
                key={priority}
                onClick={() => onPriorityToggle(priority)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  isSelected
                    ? priorityColors[priority]
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                {priority}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
