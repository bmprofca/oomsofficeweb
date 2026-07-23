import React from "react";
import {
  FiEye,
  FiFolder,
  FiUsers,
  FiUser,
  FiCalendar,
  FiEdit2,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import {
  GroupModalShell,
  MODAL_BODY_CLASS,
  formatGroupDateTime,
} from "./GroupModalParts";

const AuditPersonCard = ({
  title,
  accentClass,
  iconBgClass,
  person,
  date,
  emptyLabel,
}) => {
  const name = person?.name || person?.username || null;
  const hasData = Boolean(name || date);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div
        className={`px-3 py-2 border-b border-gray-100 flex items-center gap-2 ${accentClass}`}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
          {title}
        </span>
      </div>
      <div className="p-3">
        {!hasData ? (
          <p className="text-xs text-gray-400 italic">{emptyLabel}</p>
        ) : (
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}
            >
              <FiUser className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {name || "—"}
              </p>
              {date ? (
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FiCalendar className="w-3 h-3 shrink-0 text-gray-400" />
                  <span className="truncate">{formatGroupDateTime(date)}</span>
                </p>
              ) : null}
              {person?.mobile ? (
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FiPhone className="w-3 h-3 shrink-0 text-gray-400" />
                  <span className="truncate">{person.mobile}</span>
                </p>
              ) : null}
              {person?.email ? (
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FiMail className="w-3 h-3 shrink-0 text-gray-400" />
                  <span className="truncate">{person.email}</span>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const GroupDetailsModal = ({
  isOpen,
  group,
  onClose,
  onEdit,
}) => {
  if (!group) return null;

  const firmCount = Number(group.firm_count) || 0;
  const isActive = group.is_active !== false;

  return (
    <GroupModalShell
      open={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      icon={FiEye}
      title="Group Details"
      subtitle={group.name || "Group"}
      footer={
        <div className="flex justify-end gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(group)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      }
    >
      <div
        className={MODAL_BODY_CLASS}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 mb-4">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-indigo-100/60" />
          <div className="absolute -right-2 bottom-0 w-16 h-16 rounded-full bg-violet-100/50" />
          <div className="relative flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <FiFolder className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-gray-900 leading-snug break-words">
                {group.name || "—"}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
                <Link
                  to={`/staff/office-assistance/group-firms/${encodeURIComponent(group.group_id)}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  <FiUsers className="w-3 h-3" />
                  {firmCount} {firmCount === 1 ? "firm" : "firms"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Remark */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            Remark
          </p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {group.remark?.trim() ? group.remark : "No remark added"}
          </p>
        </div>

        {/* Create / Modify */}
        <div className="mb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-0.5">
            Activity
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AuditPersonCard
              title="Created"
              accentClass="bg-emerald-50/80"
              iconBgClass="bg-gradient-to-br from-emerald-500 to-teal-600"
              person={group.create_by}
              date={group.create_date}
              emptyLabel="No create info"
            />
            <AuditPersonCard
              title="Last modified"
              accentClass="bg-amber-50/80"
              iconBgClass="bg-gradient-to-br from-amber-500 to-orange-600"
              person={group.modify_by}
              date={group.modify_date}
              emptyLabel="Not modified yet"
            />
          </div>
        </div>
      </div>
    </GroupModalShell>
  );
};

export default GroupDetailsModal;
