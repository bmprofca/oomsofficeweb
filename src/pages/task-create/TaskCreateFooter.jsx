import React from 'react';
import { FiArrowLeft, FiArrowRight, FiPlus } from 'react-icons/fi';
import { STEPS } from './taskCreateConstants';

const btnBase =
    'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export default function TaskCreateFooter({
    step,
    onPrevious,
    onNext,
    onSubmit,
    submitting,
    showSubTaskForm,
    className = '',
}) {
    return (
        <div className={`flex justify-end items-center gap-2 ${className}`}>
            {step > 1 && (
                <button
                    type="button"
                    onClick={onPrevious}
                    className={`${btnBase} bg-slate-600 text-white hover:bg-slate-700`}
                >
                    <FiArrowLeft className="w-3.5 h-3.5" /> Previous
                </button>
            )}
            {step < STEPS.length ? (
                <button
                    type="button"
                    onClick={onNext}
                    disabled={showSubTaskForm}
                    className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-700`}
                >
                    Next <FiArrowRight className="w-3.5 h-3.5" />
                </button>
            ) : (
                <button
                    type="submit"
                    onClick={onSubmit}
                    disabled={submitting}
                    className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700`}
                >
                    {submitting ? (
                        <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating…
                        </>
                    ) : (
                        <>
                            <FiPlus className="w-3.5 h-3.5" /> Create Task
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
