# UI redesign

The app now uses compact lists, quiet separators, warm neutral surfaces and a restrained green accent. The overview prioritizes the next goal. Existing goals, steps, notes, categories, image handling and authentication retain their service/API logic. Application dependencies are unchanged.

## Daily workflow

- Goals and notes have search and category filters; goals also have stage filters.
- Goal rows support starting, resuming and completing through the existing allowed status transitions. Editing stays visible on touch devices.
- Completed goals are subdued; overdue goals have explicit deadline labels; future start dates show “即將開始”. Counts use locale formatting and retain small decimal values.
- Long titles wrap/clamp in lists and remain available in full in the editor/detail view. Long descriptions and note content expand on demand.
- Step editors collapse when editing an existing goal, open when invalid, and preserve IDs, progress and history. Save actions remain visible while scrolling.
- Loading uses quiet skeletons; empty states lead to the next action; load errors have retry controls; unavailable images have a fallback.

## Stress-test fixes

| Before | After | Why |
| --- | --- | --- |
| A 2,000-character goal description pushes actions far down the page | Two-line preview with an expandable description | Keeps progress controls reachable |
| Date input intrinsic sizing widens the grid at 200% text | Explicit `minmax(0, 1fr)` single-column grid | Prevents horizontal page overflow |
| Long lists of existing steps expose every input at once | Compact, expandable step editors | Makes editing 100+ steps manageable |
| Browser-native delete prompts | Radix confirmations, shown as bottom sheets on mobile | Provides focus trapping, Escape/cancellation and focus return |
| Broken image icons | Labeled image fallback | Preserves the layout and original image link |
| Four filters barely fit at 320px | Compact filter spacing with local scrolling for extreme counts | Keeps page width stable |

## Mobile and motion

Bottom navigation, safe-area padding, dynamic viewport sizing, keyboard resize metadata, 16px touch inputs and 44px touch buttons are included. Zoom remains enabled. Hover styles use pointer capabilities. Frequent list/filter actions update immediately; occasional confirmations use short CSS motion, disabled for keyboard opening and reduced motion.

Physical iPhone keyboard, Safari safe-area behavior and touch feel still need hardware verification. Browser emulation cannot confirm these.

## Verification

- `npm run lint` — passed with no warnings.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run test:all` — 113 tests passed.
- `npm run test:ui` — passed at 320/375/768/1440px, with 125 goals, 111 steps, 60 categories, schema-limit strings, unbroken text, overdue/undated goals, large counts, missing images, empty/error/retry states, 200% text, reduced motion and keyboard focus. Existing saves, transitions, deletion/cancellation, account isolation and progress-history preservation are covered.

Browser tests accept `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_EXECUTABLE_PATH`; see README. They write only to the local demo Firebase emulators.

Review screenshots are saved in `out/ui-redesign/` (ignored build output):

- [Desktop overview](out/ui-redesign/desktop.png)
- [Mobile overview](out/ui-redesign/mobile.png)
- [320px goals with stress data](out/ui-redesign/goals-worst-mobile.png)
- [Mobile goal form](out/ui-redesign/goal-form-mobile.png)
- [Mobile confirmation sheet](out/ui-redesign/delete-sheet-mobile.png)
- [Expanded note with missing image](out/ui-redesign/learning-worst-desktop.png)

## Files changed

- `README.md`
- `UI_REDESIGN.md`
- `scripts/check-ui.mjs`
- `src/app/(app)/error.tsx`
- `src/app/(app)/goals/[id]/page.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/loading.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/brand-logo.tsx`
- `src/components/layout/app-navigation.tsx`
- `src/components/layout/page-header.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/confirm-action.tsx`
- `src/components/ui/feedback.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/list-toolbar.tsx`
- `src/components/ui/progress-meter.tsx`
- `src/features/auth/components/auth-status.tsx`
- `src/features/auth/components/login-screen.tsx`
- `src/features/auth/components/sign-in-button.tsx`
- `src/features/auth/components/sign-out-button.tsx`
- `src/features/categories/components/category-form.tsx`
- `src/features/categories/components/category-list.tsx`
- `src/features/categories/components/category-manager.tsx`
- `src/features/dashboard/components/dashboard.tsx`
- `src/features/goals/components/goal-card.tsx`
- `src/features/goals/components/goal-detail.tsx`
- `src/features/goals/components/goal-form.tsx`
- `src/features/goals/components/goal-list.tsx`
- `src/features/goals/components/goal-status-actions.tsx`
- `src/features/goals/components/sub-goal-fields.tsx`
- `src/features/goals/components/sub-goal-list.tsx`
- `src/features/goals/components/sub-goal-progress.tsx`
- `src/features/goals/goal-presentation.ts`
- `src/features/learning/components/learning-card.tsx`
- `src/features/learning/components/learning-form.tsx`
- `src/features/learning/components/learning-image-input.tsx`
- `src/features/learning/components/learning-images.tsx`
- `src/features/learning/components/learning-list.tsx`
- `tests/goal-presentation.test.mts`
