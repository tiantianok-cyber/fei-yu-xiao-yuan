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
    // If multiple or kindergarten, clear semester
    const newSemester = (newGrades.length > 1 || newGrades.includes('幼儿园')) ? '' : semester;
    onChange(newGrades, newSemester);
  };

  return (
    <div className="space-y-3">
      {/* Grade multi-select */}
      <div className="flex flex-wrap gap-2">
        {GRADES.map((g) => (
          <div
            key={g}
            onClick={() => toggleGrade(g)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors select-none ${
              grades.includes(g)
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            <Checkbox
              checked={grades.includes(g)}
              tabIndex={-1}
              className="h-4 w-4 pointer-events-none"
            />
            {g}
          </div>
        ))}
      </div>

      {/* Semester */}
      <Select
        key={semesterDisabled ? 'disabled' : 'enabled'}
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
