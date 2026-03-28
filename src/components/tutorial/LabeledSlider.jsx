import { Slider } from "@/components/ui/slider";

export default function LabeledSlider({ label, value, displayValue, onValueChange, ...props }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span>{displayValue ?? value[0]}</span>
      </div>
      <Slider value={value} onValueChange={onValueChange} {...props} />
    </div>
  );
}
