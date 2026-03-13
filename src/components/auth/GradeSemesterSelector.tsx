import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check } from 'lucide-react';

const GRADES = [
  '幼儿园',
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '七年级', '八年级', '九年级',
  '高一', '高二', '高三',
];

const SEMESTERS = ['上学期', '下学期'];

interface GradeSemesterSelectorProps {
  grades: string[];
  semester: string;
  onChange: (grades: string[], semester: string) => void;
}

export const GradeSemesterSelector: React.FC<GradeSemesterSelectorProps> = ({
  grades,
  semester,
  onChange,
}) => {
  const isMultiple = grades.length > 1;
  const hasKindergarten = grades.includes('幼儿园');
  const semesterDisabled = !grades.length || isMultiple || hasKindergarten;

  const toggleGrade = (g: string) => {
    let newGrades: string[];
    if (grades.includes(g)) {
      newGrades = grades.filter(v => v !== g);
    } else {
      newGrades = [...grades, g];
    }
    const newSemester = (newGrades.length > 1 || newGrades.includes('幼儿园')) ? '' : semester;
    onChange(newGrades, newSemester);
  };

  return (
    <div className="space-y-3">
      {/* Grade multi-select */}
      <div className="flex flex-wrap gap-2">
        {GRADES.map((g) => {
          const selected = grades.includes(g);
          return (
            <div
              key={g}
              onClick={() => toggleGrade(g)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors select-none ${
                selected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                selected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
              }`}>
                {selected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              {g}
            </div>
          );
        })}
      </div>

      {/* Semester */}
      {semesterDisabled ? (
        <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
          {!grades.length ? '请先选择年级' :
           hasKindergarten ? '幼儿园不可选择学期' :
           '多选年级时不可选学期'}
        </div>
      ) : (
        <Select
          value={semester || undefined}
          onValueChange={(v) => onChange(grades, v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择学期" />
          </SelectTrigger>
          <SelectContent>
            {SEMESTERS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
