import React from 'react';

/** Shown while a lazy route chunk is loading. */
export default function RouteLoadingFallback() {
    return (
        <div className="app-page flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div
                    className="h-9 w-9 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600"
                    aria-hidden
                />
                <p className="text-xs font-medium text-slate-500">Loading…</p>
            </div>
        </div>
    );
}
