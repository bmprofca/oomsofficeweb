import React from 'react';
import { motion } from 'framer-motion';

/** Base pulse block */
export const SkeletonBone = ({ className = '' }) => (
    <div className={`animate-pulse rounded bg-slate-200/90 ${className}`} aria-hidden />
);

/** Shimmer bar for table cells */
export const ShimmerBone = ({ className = '' }) => (
    <div
        className={`relative overflow-hidden rounded-md bg-slate-200/80 ${className}`}
        aria-hidden
    >
        <motion.div
            className="pointer-events-none absolute inset-y-0 left-0 w-[55%] max-w-[140px] bg-gradient-to-r from-transparent via-white/55 to-transparent"
            style={{ willChange: 'transform' }}
            initial={{ x: '-100%' }}
            animate={{ x: '320%' }}
            transition={{
                duration: 1.45,
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 0.2,
            }}
        />
    </div>
);

const SectionBlockSkeleton = ({ fieldCount = 4, cols = 'sm:grid-cols-2 lg:grid-cols-3' }) => (
    <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2.5 md:px-4">
            <SkeletonBone className="h-7 w-7 shrink-0 rounded-lg" />
            <SkeletonBone className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-1 gap-4 p-3 md:p-4">
            <div className={`grid grid-cols-1 gap-4 ${cols}`}>
                {Array.from({ length: fieldCount }, (_, i) => (
                    <div key={i} className="min-w-0">
                        <SkeletonBone className="mb-1 h-3 w-16" />
                        <SkeletonBone className="h-4 w-full max-w-[180px]" />
                    </div>
                ))}
            </div>
        </div>
    </section>
);

/** Matches DetailsTab card layout */
export const DetailsTabSkeleton = () => (
    <div
        className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        aria-busy="true"
        aria-label="Loading task details"
    >
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
            <div className="flex min-w-0 items-center gap-3">
                <SkeletonBone className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <SkeletonBone className="h-5 w-28" />
                        <SkeletonBone className="h-6 w-20 rounded-full" />
                        <SkeletonBone className="h-6 w-24 rounded-full" />
                    </div>
                    <SkeletonBone className="h-3 w-48" />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <SkeletonBone className="h-9 w-28 rounded-lg" />
                <SkeletonBone className="h-9 w-24 rounded-lg" />
            </div>
        </div>

        <div className="space-y-3 p-3 md:p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <SectionBlockSkeleton fieldCount={3} cols="grid-cols-1" />
                <SectionBlockSkeleton fieldCount={4} cols="grid-cols-2" />
                <SectionBlockSkeleton fieldCount={3} cols="grid-cols-1 sm:grid-cols-2" />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <section className="rounded-lg border border-gray-200 bg-white">
                    <div className="flex items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2.5 md:px-4">
                        <SkeletonBone className="h-7 w-7 rounded-lg" />
                        <SkeletonBone className="h-4 w-16" />
                    </div>
                    <div className="flex items-start gap-3 p-3 md:p-4">
                        <SkeletonBone className="h-9 w-9 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <SkeletonBone className="h-4 w-36" />
                            <SkeletonBone className="h-3 w-28" />
                            <SkeletonBone className="h-3 w-40" />
                        </div>
                    </div>
                </section>
                <SectionBlockSkeleton fieldCount={4} cols="sm:grid-cols-2" />
            </div>

            <section className="rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2.5 md:px-4">
                    <SkeletonBone className="h-7 w-7 rounded-lg" />
                    <SkeletonBone className="h-4 w-14" />
                </div>
                <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3 md:p-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                            <SkeletonBone className="mb-2 h-3 w-20" />
                            <SkeletonBone className="mb-2 h-4 w-32" />
                            <SkeletonBone className="mb-1 h-3 w-24" />
                            <SkeletonBone className="h-3 w-36" />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    </div>
);

/** Matches NotesTab list rows (header/search stay visible) */
export const NotesListSkeleton = ({ rowCount = 5 }) => (
    <div className="divide-y divide-gray-100" aria-busy="true" aria-label="Loading notes">
        {Array.from({ length: rowCount }, (_, i) => (
            <div key={i} className="p-4">
                <div className="flex items-start gap-3">
                    <SkeletonBone className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <SkeletonBone className="h-4 w-40" />
                            <SkeletonBone className="h-4 w-12 rounded-full" />
                        </div>
                        <SkeletonBone className="h-3 w-full max-w-md" />
                        <div className="flex items-center gap-3">
                            <SkeletonBone className="h-3 w-24" />
                            <SkeletonBone className="h-3 w-28" />
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

/** Matches StaffTab table body */
export const StaffTableSkeleton = ({ rowCount = 6 }) => (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Loading staff">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="w-10 py-3 pl-6 pr-3" />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Staff Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Designation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Assigned On
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
                {Array.from({ length: rowCount }, (_, i) => (
                    <tr key={i}>
                        <td className="py-3.5 pl-6 pr-3">
                            <ShimmerBone className="h-[18px] w-[18px] rounded-[5px]" />
                        </td>
                        <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                                <ShimmerBone className="h-9 w-9 rounded-full" />
                                <ShimmerBone className="h-4 w-32" />
                            </div>
                        </td>
                        <td className="px-4 py-3.5">
                            <ShimmerBone className="h-4 w-24" />
                        </td>
                        <td className="px-4 py-3.5">
                            <ShimmerBone className="mb-1 h-3 w-28" />
                            <ShimmerBone className="h-3 w-36" />
                        </td>
                        <td className="px-4 py-3.5">
                            <ShimmerBone className="h-4 w-24" />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                            <ShimmerBone className="ml-auto h-8 w-8 rounded-lg" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** Matches TimelogTab table body */
export const TimelogTableSkeleton = ({ rowCount = 6 }) => (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Loading timelogs">
        <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-900">
                <tr>
                    <th className="rounded-l-xl px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">CREATE</th>
                    <th className="px-4 py-3 font-semibold">NAME</th>
                    <th className="px-4 py-3 font-semibold">USER</th>
                    <th className="px-4 py-3 font-semibold">TIMESTAMP</th>
                    <th className="px-4 py-3 font-semibold">SPENT</th>
                    <th className="rounded-r-xl px-4 py-3 font-semibold">ACTION</th>
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rowCount }, (_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-3">
                            <ShimmerBone className="h-4 w-6" />
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                                <ShimmerBone className="h-3 w-3 rounded" />
                                <ShimmerBone className="h-4 w-20" />
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <ShimmerBone className="h-4 w-36" />
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                                <ShimmerBone className="h-6 w-6 rounded-full" />
                                <ShimmerBone className="h-4 w-24" />
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <ShimmerBone className="mb-1 h-3.5 w-36" />
                            <ShimmerBone className="mb-1 h-3 w-6" />
                            <ShimmerBone className="h-3.5 w-36" />
                        </td>
                        <td className="px-4 py-3">
                            <ShimmerBone className="h-4 w-16" />
                        </td>
                        <td className="px-4 py-3">
                            <ShimmerBone className="mx-auto h-8 w-8 rounded-lg" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** Matches SubTaskTab table body */
export const SubTaskTableSkeleton = ({ rowCount = 6 }) => (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Loading subtasks">
        <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-900">
                <tr>
                    <th className="rounded-l-xl px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">TYPE</th>
                    <th className="px-4 py-3 font-semibold">CONTENT / SERVICE</th>
                    <th className="px-4 py-3 font-semibold">STATUS</th>
                    <th className="px-4 py-3 font-semibold">CREATED BY</th>
                    <th className="px-4 py-3 font-semibold">CREATED DATE</th>
                    <th className="rounded-r-xl px-4 py-3 font-semibold">ACTIONS</th>
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rowCount }, (_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-3">
                            <ShimmerBone className="h-4 w-6" />
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                                <ShimmerBone className="h-7 w-7 rounded-lg" />
                                <ShimmerBone className="h-4 w-16" />
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <ShimmerBone className="mb-1 h-4 w-48" />
                            <ShimmerBone className="h-3 w-32" />
                        </td>
                        <td className="px-4 py-3">
                            <ShimmerBone className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="px-4 py-3">
                            <ShimmerBone className="h-4 w-28" />
                        </td>
                        <td className="px-4 py-3">
                            <ShimmerBone className="h-4 w-24" />
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex gap-1">
                                <ShimmerBone className="h-8 w-8 rounded-lg" />
                                <ShimmerBone className="h-8 w-8 rounded-lg" />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** Ledger toolbar placeholder while initial data loads */
export const LedgerToolbarSkeleton = () => (
    <div className="flex flex-wrap items-start justify-between gap-4" aria-hidden>
        <div className="min-w-0 space-y-2">
            <SkeletonBone className="h-5 w-32" />
            <SkeletonBone className="h-4 w-40" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
            <SkeletonBone className="h-10 w-36 rounded-lg" />
            <SkeletonBone className="h-10 w-56 rounded-lg" />
            <SkeletonBone className="h-10 w-10 rounded-lg" />
            <SkeletonBone className="h-10 w-24 rounded-lg" />
            <SkeletonBone className="h-10 w-10 rounded-lg" />
        </div>
    </div>
);

/** Document table skeleton rows — shared with DocumentTab */
export const DocumentTableSkeletonRows = ({ rowCount = 8 }) =>
    Array.from({ length: rowCount }, (_, i) => (
        <tr key={`doc-sk-${i}`} className="border-b border-slate-100">
            <td className="px-3 py-3">
                <ShimmerBone className="h-[18px] w-[18px] rounded-[5px]" />
            </td>
            <td className="px-3 py-3">
                <ShimmerBone className="h-4 w-7" />
            </td>
            <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                    <ShimmerBone className="h-5 w-5 rounded" />
                    <ShimmerBone className="h-4 max-w-[200px] flex-1" />
                </div>
            </td>
            <td className="px-3 py-3">
                <ShimmerBone className="h-4 w-24" />
            </td>
            <td className="px-3 py-3">
                <ShimmerBone className="h-5 w-14" />
            </td>
            <td className="px-3 py-3">
                <ShimmerBone className="h-4 w-12" />
            </td>
            <td className="px-3 py-3">
                <ShimmerBone className="h-4 w-20" />
            </td>
            <td className="px-3 py-3">
                <ShimmerBone className="h-8 w-8 rounded-lg" />
            </td>
            <td className="px-3 py-3">
                <div className="flex gap-1">
                    <ShimmerBone className="h-8 w-8 rounded-lg" />
                    <ShimmerBone className="h-8 w-8 rounded-lg" />
                </div>
            </td>
        </tr>
    ));
