# Branch subscriptions — Client context

> **Purpose:** Tag when changing subscription UI, access gates, or branch switching. Pair with [`SERVER/context/subscription.md`](../../SERVER/context/subscription.md).

---

## Mental model

```
GET /subscription/status  (branch header)
        ↓
useSubscription()  →  hasAccess / isSubscribed
        ↓
SubscriptionProtectedRoute / header feature gates
```

**Hook:** `src/hooks/useSubscription.js`  
**Gate:** `src/components/SubscriptionProtectedRoute.js`  
**Branch switch:** `src/utils/branchSwitch.js` + `BranchSwitchOverlay.jsx`  
**Settings page:** `src/pages/settings/subscription.jsx`

---

## Cache / refresh rules

- Persist status in `localStorage` (`ooms_subscription_status` + branch id + timestamp) for **instant paint**.
- **Always revalidate** from API on mount (and throttled on tab focus) — **silent** when cache exists (no full-screen “Checking…” flash).
- Show loading UI only when there is **no usable cache** for the current branch.
- Access decisions require `subscription.branch_id === localStorage.branch_id`.
- **One in-flight request** for `/subscription/status` — all hook mounts share / join the same promise (never parallel fan-out).
- **One module-level** `visibilitychange` + `window` `focus` listener (not per `useSubscription()` instance). Focus revalidate is throttled (~30s) and skipped when a recent successful fetch already exists.

### Do not

- Trust a long TTL without network revalidate (admin / other browser can change plans).
- Broadcast empty “no plan” while switching branches (causes Premium gate flash).
- Attach focus/visibility listeners inside every hook instance (causes N duplicate calls when N components use the hook).

---

## Branch switch

`performBranchSwitch(branch)`:

1. Show overlay (“Switching workspace”).
2. `clearSubscriptionForBranchSwitch()` (no EMPTY notify).
3. `applyBranchToSession` + clear list/permission caches.
4. Warm `fetchSubscriptionStatusForBranch`.
5. `window.location.reload()` so every page refetches for the new branch.

Entry points: Header company switch, `branch-setup.jsx`.

While switching / verifying, `SubscriptionProtectedRoute` shows **`WorkspaceSyncScreen`**, never the Premium upgrade gate.

---

## Protected route

```jsx
if (isBranchSwitching || verifyingBranch || loading) → WorkspaceSyncScreen
else if (!hasAccess(level)) → SubscriptionBlockedScreen  // Refresh access button
else → children
```

Feature levels: `core`, `salary-management`, `attendance-management`, `live-chat`.

---

## Admin (separate app)

Manual plan assign / expiry lives in **ADMIN** `BranchDetails` → Subscription tab  
(`POST/PATCH /admin/branch/:id/subscriptions…`). Client only reads `/subscription/status`.
