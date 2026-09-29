import { MESES } from "@/lib/finance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  years: number[];
  year: string;
  month: string;
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  allowAllYears?: boolean;
};

export function PeriodFilter({
  years,
  year,
  month,
  onYear,
  onMonth,
  allowAllYears = true,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={year} onValueChange={onYear}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          {allowAllYears && <SelectItem value="todos">Todos os anos</SelectItem>}
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={onMonth}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os meses</SelectItem>
          {MESES.map((m, i) => (
            <SelectItem key={m} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
