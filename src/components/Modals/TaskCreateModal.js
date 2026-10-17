import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiCheckSquare, FiLock, FiPlus } from 'react-icons/fi';
import { useUserPermissions } from '../../utils/permission-helper';
import TaskCreateForm from '../../pages/task-create/TaskCreateForm';
import { STEPS } from '../../pages/task-create/taskCreateConstants';
import {
    WizardBody,
    WizardFooter,
    WizardHeader,
    WizardModal,
    WizardStepIntro,
    WizardStepper,
} from './WizardModalParts';
import '../../pages/task-create/task-create.css';

const STEP_COPY = {
    1: { title: 'Who is this task for?', description: 'Pick the firms — or whole groups — the task should be created for.' },
    2: { title: 'Service, fees & due date', description: 'Choose the service and confirm fees, due date and the applicable years.' },
    3: { title: 'Sub tasks', description: 'Optional checklist items that will be created under each task.' },
    4: { title: 'CA & team', description: 'Assign the reviewing CA and the employees who will work on it.' },
    5: { title: 'Notes & attachments', description: 'Add context for the team: written notes, files or a quick voice note.' },
};

/**
 * Global task-create modal. Opened from anywhere via `useTaskCreate().openTaskCreate()`.
 */
export default function TaskCreateModal({ isOpen, onClose, onSuccess, onNavigateToTaskList, prefill = null }) {
    const { check } = useUserPermissions();
    const formRef = useRef(null);
    const [footerState, setFooterState] = useState({ step: 1, submitting: false, subTaskDraftActive: false });

    const handleStepChange = useCallback((next) => {
        setFooterState((prev) =>
            prev.step === next.step && prev.submitting === next.submitting && prev.subTaskDraftActive === next.subTaskDraftActive
                ? prev
                : next
        );
    }, []);

    useEffect(() => {
        if (!isOpen) setFooterState({ step: 1, submitting: false, subTaskDraftActive: false });
    }, [isOpen]);

    const canCreate = check('task_create');
    const prefillKey = JSON.stringify(prefill || {});
    const { step, submitting, subTaskDraftActive } = footerState;
    const total = STEPS.length;
    const copy = STEP_COPY[step] || {};

    return (
        <WizardModal isOpen={isOpen} onClose={onClose} labelledBy="task-create-modal-title">
            <WizardHeader
                id="task-create-modal-title"
                icon={<FiCheckSquare className="h-5 w-5" />}
                title="New task"
                subtitle={canCreate ? `Step ${step} of ${total} · ${STEPS[step - 1]?.title}` : 'Create a task for one or more firms'}
                onClose={onClose}
            />

            {!canCreate ? (
                <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <FiLock className="h-5 w-5 text-slate-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800">You can't create tasks</h3>
                        <p className="mt-1 text-xs text-slate-500">Ask your branch admin for the “Create task” permission.</p>
                    </div>
                </div>
            ) : (
                <>
                    <WizardStepper
                        steps={STEPS}
                        current={step}
                        onStepClick={(n) => formRef.current?.goToStep?.(n)}
                        canJumpTo={(n) => n < step}
                    />
                    <WizardBody>
                        <WizardStepIntro step={step} total={total} title={copy.title} description={copy.description} />
                        <TaskCreateForm
                            key={prefillKey}
                            ref={formRef}
                            layout="modal"
                            resourcesEnabled
                            prefill={prefill}
                            onClose={onClose}
                            onSuccess={onSuccess}
                            onNavigateToTaskList={onNavigateToTaskList}
                            onStepChange={handleStepChange}
                        />
                    </WizardBody>
                    <WizardFooter hint={step < total ? `Next: ${STEPS[step]?.title}` : 'Review everything, then create the task.'}>
                        {step > 1 ? (
                            <button type="button" onClick={() => formRef.current?.goPrevious()} className="ui-btn ui-btn-secondary">
                                <FiArrowLeft className="h-4 w-4" />
                                Back
                            </button>
                        ) : (
                            <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost">
                                Cancel
                            </button>
                        )}
                        {step < total ? (
                            <button
                                type="button"
                                onClick={() => formRef.current?.goNext()}
                                disabled={subTaskDraftActive}
                                className="ui-btn ui-btn-primary min-w-[112px]"
                            >
                                Continue
                                <FiArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => formRef.current?.handleCreate(e)}
                                disabled={submitting}
                                className="ui-btn ui-btn-primary min-w-[132px]"
                            >
                                {submitting ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Creating…
                                    </>
                                ) : (
                                    <>
                                        <FiPlus className="h-4 w-4" />
                                        Create task
                                    </>
                                )}
                            </button>
                        )}
                    </WizardFooter>
                </>
            )}
        </WizardModal>
    );
}
