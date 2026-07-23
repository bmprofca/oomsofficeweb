import React, { useMemo } from "react";
import CustomSelect from "../../../components/CustomSelect";

export function MappingStep({
  headers = [],
  panIndex,
  nameIndex,
  error,
  busy,
  onPanChange,
  onNameChange,
}) {
  const options = useMemo(
    () =>
      headers.map((h, i) => ({
        value: String(i),
        label: `${h} (index ${i})`,
      })),
    [headers],
  );

  const panValue =
    panIndex == null
      ? null
      : options.find((o) => o.value === String(panIndex)) || null;
  const nameValue =
    nameIndex == null
      ? null
      : options.find((o) => o.value === String(nameIndex)) || null;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-800">Map columns</h4>
        <p className="text-xs text-gray-500 mt-0.5">
          Select which Excel columns contain PAN and Firm Name. Values store the
          column index for reading rows.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <CustomSelect
            label="PAN Column"
            required
            options={options}
            value={panValue}
            onChange={(opt) => onPanChange?.(opt?.value ?? "")}
            placeholder="-- Select column --"
            searchPlaceholder="Search columns..."
            isDisabled={busy}
            isClearable
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <CustomSelect
            label="Firm Name Column"
            required
            options={options}
            value={nameValue}
            onChange={(opt) => onNameChange?.(opt?.value ?? "")}
            placeholder="-- Select column --"
            searchPlaceholder="Search columns..."
            isDisabled={busy}
            isClearable
          />
        </div>
      </div>

      {error ? (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
