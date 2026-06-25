import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { STEPS } from './taskCreateConstants';

export default function TaskCreateStepIndicator({
    step,
    onGoToStep,
    compact = false,
    headerInline = false,
    disableNavigation = false,
}) {
    const circleClass = headerInline
        ? 'w-6 h-6 text-[10px] font-medium border'
        : 'w-9 h-9 text-sm font-semibold border-2';

    const wrapperClass = headerInline
        ? ''
        : compact
          ? 'px-1'
          : 'px-4 sm:px-6 py-5 border-b border-gray-100 bg-gray-50/80 rounded-t-2xl';

    const StepWrapper = disableNavigation ? 'div' : 'button';

    return (
        <div className={wrapperClass}>
            <div className="flex items-start justify-between gap-0.5">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s.n}>
                        <StepWrapper
                            type={disableNavigation ? undefined : 'button'}
                            onClick={disableNavigation ? undefined : () => onGoToStep?.(s.n)}
                            title={s.title}
                            className={`flex flex-col items-center min-w-0 flex-1 rounded-md ${
                                disableNavigation ? 'cursor-default' : 'focus-visible:ring-2 focus-visible:ring-indigo-500'
                            } ${headerInline ? 'px-0.5 pt-0.5' : 'p-1'}`}
                        >
                            <div
                                className={`flex items-center justify-center rounded-full ${circleClass} ${
                                    s.n === step
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : s.n < step
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : 'bg-white border-gray-300 text-gray-400'
                                }`}
                            >
                                {s.n < step ? <FiCheck className={headerInline ? 'w-2.5 h-2.5' : 'w-4 h-4'} /> : s.n}
                            </div>
                            <span
                                className={`mt-1 text-[9px] sm:text-[10px] font-medium truncate max-w-full text-center leading-tight px-0.5 ${
                                    s.n === step
                                        ? 'text-indigo-600'
                                        : s.n < step
                                          ? 'text-emerald-600'
                                          : 'text-gray-400'
                                } ${!headerInline && !compact ? '' : ''}`}
                            >
                                {s.title}
                            </span>
                        </StepWrapper>
                        {i < STEPS.length - 1 && (
                            <div
                                className={`flex-1 h-px mx-0.5 rounded-full min-w-[6px] mt-3 ${
                                    s.n < step ? 'bg-emerald-400' : 'bg-gray-200'
                                }`}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
