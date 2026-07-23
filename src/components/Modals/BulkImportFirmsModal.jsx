import React, { useEffect, useState } from "react";
import { FiUpload, FiAlertTriangle } from "react-icons/fi";
import { GroupModalShell, MODAL_BODY_CLASS } from "./GroupModalParts";
import { STEPS } from "../../features/group-firms-bulk-import/constants";
import { useGroupFirmsBulkImport } from "../../features/group-firms-bulk-import/useGroupFirmsBulkImport";
import { UploadStep } from "../../features/group-firms-bulk-import/components/UploadStep";
import { MappingStep } from "../../features/group-firms-bulk-import/components/MappingStep";
import { PreviewTable } from "../../features/group-firms-bulk-import/components/PreviewTable";
import { ensureXlsxLoaded } from "../../features/group-firms-bulk-import/excelParse";

const btnSecondary =
  "px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50";
const btnPrimary =
  "px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5";
const btnViolet =
  "px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5";
const btnReport =
  "px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg disabled:opacity-50";
const btnReset =
  "px-4 py-2 text-sm font-medium text-amber-800 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg disabled:opacity-50";

function Spinner() {
  return (
    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}

/**
 * Bulk Import Firms into Group — multi-step modal.
 */
export default function BulkImportFirmsModal({
  open,
  groupId,
  onClose,
  onImported,
}) {
  const bulk = useGroupFirmsBulkImport({
    groupId,
    onImported,
  });
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      bulk.reset();
      setResetConfirmOpen(false);
      return undefined;
    }
    ensureXlsxLoaded().catch(() => {});
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    if (bulk.busy) return;
    bulk.reset();
    setResetConfirmOpen(false);
    onClose?.();
  };

  const stepLabel =
    bulk.step === STEPS.UPLOAD
      ? "Step 1 · Upload"
      : bulk.step === STEPS.MAPPING
        ? "Step 2 · Map columns"
        : bulk.step === STEPS.DONE
          ? "Complete · Download report"
          : "Step 3 · Validate & import";

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        {bulk.step === STEPS.UPLOAD ? (
          <button
            type="button"
            onClick={handleClose}
            disabled={bulk.busy}
            className={btnSecondary}
          >
            Cancel
          </button>
        ) : null}

        {bulk.step === STEPS.MAPPING ? (
          <button
            type="button"
            onClick={bulk.goToUpload}
            disabled={bulk.busy}
            className={btnSecondary}
          >
            Back
          </button>
        ) : null}

        {bulk.step === STEPS.PREVIEW || bulk.step === STEPS.DONE ? (
          <button
            type="button"
            onClick={
              bulk.importDone ? handleClose : bulk.goToMappingFromPreview
            }
            disabled={bulk.busy}
            className={btnSecondary}
          >
            {bulk.importDone ? "Close" : "Back"}
          </button>
        ) : null}

        {bulk.hasDeletedRows ? (
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            disabled={bulk.busy}
            className={btnReset}
          >
            Reset
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        {bulk.step !== STEPS.UPLOAD && bulk.step !== STEPS.DONE ? (
          <button
            type="button"
            onClick={handleClose}
            disabled={bulk.busy}
            className={btnSecondary}
          >
            Cancel
          </button>
        ) : null}

        {bulk.canDownloadReport ? (
          <button
            type="button"
            onClick={bulk.downloadReport}
            disabled={bulk.busy}
            className={btnReport}
          >
            Download Report
          </button>
        ) : null}

        {bulk.step === STEPS.UPLOAD ? (
          <button
            type="button"
            onClick={bulk.goToMapping}
            disabled={bulk.busy || !bulk.file}
            className={btnPrimary}
          >
            {bulk.busy ? <Spinner /> : null}
            Continue
          </button>
        ) : null}

        {bulk.step === STEPS.MAPPING ? (
          <button
            type="button"
            onClick={bulk.generatePreview}
            disabled={bulk.busy || !bulk.mappingReady}
            className={btnPrimary}
          >
            Generate Preview
          </button>
        ) : null}

        {bulk.step === STEPS.PREVIEW ? (
          <>
            <button
              type="button"
              onClick={bulk.runServerValidation}
              disabled={!bulk.canValidate}
              className={btnViolet}
            >
              {bulk.busy ? <Spinner /> : null}
              Validate
            </button>
            <button
              type="button"
              onClick={bulk.runImport}
              disabled={!bulk.canImport}
              className={btnPrimary}
            >
              {bulk.busy ? <Spinner /> : null}
              Import
            </button>
          </>
        ) : null}

        {bulk.step === STEPS.DONE ? (
          <button type="button" onClick={handleClose} className={btnPrimary}>
            Done
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <GroupModalShell
        open={open}
        onClose={handleClose}
        closeDisabled={bulk.busy}
        maxWidth="max-w-6xl"
        panelClassName="h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)]"
        icon={FiUpload}
        title="Bulk Import Firms"
        subtitle={stepLabel}
        zIndex="z-[200]"
        footer={footer}
      >
        <div
          className={MODAL_BODY_CLASS}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {bulk.step === STEPS.UPLOAD ? (
            <UploadStep
              file={bulk.file}
              busy={bulk.busy}
              error={bulk.error}
              onFile={bulk.handleFile}
              onDownloadSample={bulk.downloadSample}
            />
          ) : null}

          {bulk.step === STEPS.MAPPING ? (
            <MappingStep
              headers={bulk.headers}
              panIndex={bulk.panIndex}
              nameIndex={bulk.nameIndex}
              error={bulk.error}
              busy={bulk.busy}
              onPanChange={bulk.setPanIndex}
              onNameChange={bulk.setNameIndex}
            />
          ) : null}

          {bulk.step === STEPS.PREVIEW || bulk.step === STEPS.DONE ? (
            <PreviewTable
              rows={bulk.previewRows}
              summary={bulk.summary}
              busy={bulk.busy}
              error={bulk.error}
              importDone={bulk.importDone}
              onDelete={bulk.deleteRow}
            />
          ) : null}
        </div>
      </GroupModalShell>

      <GroupModalShell
        open={resetConfirmOpen}
        onClose={() => !bulk.busy && setResetConfirmOpen(false)}
        closeDisabled={bulk.busy}
        maxWidth="max-w-sm"
        headerClass="bg-gradient-to-r from-amber-500 to-orange-500"
        icon={FiAlertTriangle}
        title="Reset preview?"
        subtitle="Restore deleted rows"
        zIndex="z-[220]"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(false)}
              disabled={bulk.busy}
              className={`flex-1 ${btnSecondary}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                bulk.resetPreviewRows();
                setResetConfirmOpen(false);
              }}
              disabled={bulk.busy}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
            >
              Reset list
            </button>
          </div>
        }
      >
        <div
          className={MODAL_BODY_CLASS}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <p className="text-sm text-gray-600">
            This restores all deleted rows from the original preview and
            re-runs local validation. Server validation will need to be run
            again.
          </p>
        </div>
      </GroupModalShell>
    </>
  );
}
