import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const GRADES = [
  '幼儿园',
  '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
  '初中一年级', '初中二年级', '初中三年级',
  '高中一年级', '高中二年级', '高中三年级',
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
    // If multiple or kindergarten, clear semester
    const newSemester = (newGrades.length > 1 || newGrades.includes('幼儿园')) ? '' : semester;
    onChange(newGrades, newSemester);
  };

  return (
    <div className="space-y-3">
      {/* Grade multi-select */}
      <div className="flex flex-wrap gap-2">
        {GRADES.map((g) => (
          <label
            key={g}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
              grades.includes(g)
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            <Checkbox
              checked={grades.includes(g)}
              onCheckedChange={() => toggleGrade(g)}
              className="h-4 w-4"
            />
            {g}
          </label>
        ))}
      </div>

      {/* Semester */}
      <Select
        value={semester || undefined}
        onValueChange={(v) => onChange(grades, v)}
        disabled={semesterDisabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={
            !grades.length ? '请先选择年级' :
            hasKindergarten ? '幼儿园不可选择学期' :
            isMultiple ? '多选年级时不可选学期' :
            '选择学期'
          } />
        </SelectTrigger>
        <SelectContent>
          {SEMESTERS.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
