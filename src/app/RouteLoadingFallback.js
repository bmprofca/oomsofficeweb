import React from 'react';

/** Shown while a lazy route chunk is loading. */
export default function RouteLoadingFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="flex flex-col items-center gap-3">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
                    aria-hidden
                />
                <p className="text-sm text-slate-500">Loading…</p>
            </div>
        </div>
    );
}
