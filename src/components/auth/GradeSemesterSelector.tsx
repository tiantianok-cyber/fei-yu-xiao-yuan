import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GRADES = [
  '幼儿园',
  '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
  '初一', '初二', '初三',
  '高一',
];

const SEMESTERS = ['上学期', '下学期'];

interface GradeSemesterSelectorProps {
  grade: string;
  semester: string;
  onChange: (grade: string, semester: string) => void;
}

export const GradeSemesterSelector: React.FC<GradeSemesterSelectorProps> = ({
  grade,
  semester,
  onChange,
}) => {
  const isKindergarten = grade === '幼儿园';

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={grade}
        onValueChange={(v) => {
          onChange(v, v === '幼儿园' ? '' : semester);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择年级" />
        </SelectTrigger>
        <SelectContent>
          {GRADES.map((g) => (
            <SelectItem key={g} value={g}>{g}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={semester}
        onValueChange={(v) => onChange(grade, v)}
        disabled={!grade || isKindergarten}
      >
        <SelectTrigger>
          <SelectValue placeholder={isKindergarten ? '不可选' : '选择学期'} />
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
