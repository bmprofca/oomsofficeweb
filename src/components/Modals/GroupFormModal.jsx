import React from "react";
import { FiPlus, FiEdit } from "react-icons/fi";
import {
  GroupModalShell,
  MODAL_BODY_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
} from "./GroupModalParts";

/**
 * Create / Edit group form modal.
 * @param {"create"|"edit"} mode
 */
const GroupFormModal = ({
  isOpen,
  mode = "create",
  form,
  onChange,
  onClose,
  onSubmit,
  saving = false,
}) => {
  const isEdit = mode === "edit";
  const formId = isEdit ? "edit-group-form" : "create-group-form";

  const handleField = (field) => (e) => {
    onChange?.({ ...form, [field]: e.target.value });
  };

  return (
    <GroupModalShell
      open={isOpen}
      onClose={onClose}
      closeDisabled={saving}
      maxWidth="max-w-md"
      icon={isEdit ? FiEdit : FiPlus}
      title={isEdit ? "Edit Group" : "Create Group"}
      subtitle={isEdit ? "Update group details" : "Add a new firm group"}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      }
    >
      <div className={MODAL_BODY_CLASS} style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <form id={formId} onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className={LABEL_CLASS} htmlFor={`${formId}-name`}>
              Group name *
            </label>
            <input
              id={`${formId}-name`}
              type="text"
              value={form?.name || ""}
              onChange={handleField("name")}
              disabled={saving}
              className={INPUT_CLASS}
              placeholder="Enter group name"
              autoFocus
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor={`${formId}-remark`}>
              Remark
            </label>
            <textarea
              id={`${formId}-remark`}
              value={form?.remark || ""}
              onChange={handleField("remark")}
              disabled={saving}
              rows={3}
              className={`${INPUT_CLASS} resize-none`}
              placeholder="Optional note…"
            />
          </div>
        </form>
      </div>
    </GroupModalShell>
  );
};

export default GroupFormModal;
