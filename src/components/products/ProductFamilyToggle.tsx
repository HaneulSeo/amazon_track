"use client";

type FamilyOption = {
  id: string;
  label: string;
  count: number;
};

type ProductFamilyToggleProps = {
  options: FamilyOption[];
  selectedFamily: string;
  onChange: (family: string) => void;
};

export function ProductFamilyToggle({ options, selectedFamily, onChange }: ProductFamilyToggleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selectedFamily === option.id;
        return (
          <button
            key={option.id}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition ${
              active ? "bg-toss-blue text-white" : "bg-white text-toss-gray ring-1 ring-[#dde2ea] hover:text-toss-ink"
            }`}
            type="button"
            onClick={() => onChange(option.id)}
          >
            <span>{option.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15 text-white" : "bg-[#f4f6fa] text-toss-gray"}`}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
