import React from "react";
import CustomSelect from "./CustomSelect";

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const MONTH_DAY_OPTIONS = [
  ...Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  })),
  { value: "last", label: "Last day of month" },
];

const pad2 = (value) => String(value ?? "0").padStart(2, "0");

const optionByValue = (options, value) =>
  options.find((o) => String(o.value) === String(value)) || null;

export const emptyRecurringForm = () => ({
  type: "daily",
  day: "1",
  date: "1",
  hour: "09",
  minute: "00",
});

export const buildRecurringConfig = (form) => {
  const time = `${pad2(form.hour)}:${pad2(form.minute)}`;
  if (form.type === "daily") return { time };
  if (form.type === "weekly") {
    return { time, day_of_week: Number(form.day) };
  }
  if (form.date === "last") {
    return { time, last_day_of_month: true };
  }
  return { time, day_of_month: Number(form.date) || 1 };
};

export const formatRecurringSummary = (form) => {
  const config = buildRecurringConfig(form);
  const time = config.time || "—";
  if (form.type === "daily") return `Every day at ${time} (IST)`;
  if (form.type === "weekly") {
    const day =
      DAY_OPTIONS.find((d) => String(d.value) === String(form.day))?.label ||
      "—";
    return `Every ${day} at ${time} (IST)`;
  }
  if (form.date === "last") return `Last day of month at ${time} (IST)`;
  const dayNum = Number(form.date) || 1;
  const suffix =
    dayNum % 100 >= 11 && dayNum % 100 <= 13
      ? "th"
      : ["th", "st", "nd", "rd"][dayNum % 10] || "th";
  return `Every ${dayNum}${suffix} of month at ${time} (IST)`;
};

export const handleRecurringFormChange = (setForm, field, value) => {
  if (field === "time" && value && typeof value === "object") {
    setForm((prev) => ({
      ...prev,
      hour: pad2(value.hour),
      minute: pad2(value.minute),
    }));
    return;
  }
  setForm((prev) => ({ ...prev, [field]: value }));
};

/**
 * Shared recurring schedule controls (daily / weekly / monthly + time).
 */
export default function RecurringScheduleFields({
  form,
  onChange,
  disabled = false,
  labelClassName = "block text-xs font-semibold text-gray-600 mb-1",
  inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:opacity-60 bg-white",
}) {
  const timeValue = `${pad2(form.hour)}:${pad2(form.minute)}`;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelClassName}>Frequency</label>
        <CustomSelect
          options={FREQUENCY_OPTIONS}
          value={optionByValue(FREQUENCY_OPTIONS, form.type)}
          onChange={(opt) => onChange("type", opt?.value || "daily")}
          placeholder="Select frequency"
          isClearable={false}
          isDisabled={disabled}
        />
      </div>
      <div>
        <label className={labelClassName}>Send at (IST)</label>
        <input
          type="time"
          step={60}
          value={timeValue}
          disabled={disabled}
          onChange={(e) => {
            const raw = String(e.target.value || "09:00");
            const [h = "09", m = "00"] = raw.split(":");
            onChange("time", { hour: pad2(h), minute: pad2(m) });
          }}
          className={inputClassName}
        />
      </div>
      {form.type === "weekly" ? (
        <div className="sm:col-span-2">
          <label className={labelClassName}>Day of week</label>
          <CustomSelect
            options={DAY_OPTIONS}
            value={optionByValue(DAY_OPTIONS, form.day)}
            onChange={(opt) => onChange("day", opt?.value ?? "1")}
            placeholder="Select day"
            isClearable={false}
            isDisabled={disabled}
          />
        </div>
      ) : null}
      {form.type === "monthly" ? (
        <div className="sm:col-span-2">
          <label className={labelClassName}>Day of month</label>
          <CustomSelect
            options={MONTH_DAY_OPTIONS}
            value={optionByValue(MONTH_DAY_OPTIONS, form.date)}
            onChange={(opt) => onChange("date", opt?.value || "1")}
            placeholder="Select date"
            isClearable={false}
            isDisabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}

export {
  DAY_OPTIONS,
  FREQUENCY_OPTIONS,
  MONTH_DAY_OPTIONS,
  pad2,
};
