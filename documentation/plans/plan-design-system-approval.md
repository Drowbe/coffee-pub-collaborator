# Design System Approval Sheet

**Audience:** Thomas, who decides. About ten minutes to read.

**Status:** Approved 2026-10-21. Thomas approved all 18 drawn families as drawn (every choice B1a to B18b, and the fixes C1 and C6), which with the 8 earlier approvals makes 26 families approved. His decisions on the open items:

- **C2.** The ok green used as a mark (bars, the presence dot) uses a darker ok mix so it reaches 3:1 in light mode; dark mode is unchanged.
- **C3.** The environment name in the top bar is Figtree 600 at 16px below 640px and Fraunces 600 at 18px from 641px up; long names ellipsize.
- **C4.** Calming Teal keeps its teal; text on teal fills and teal used as text are picked automatically; the theme editor warns about the low-contrast pairs that remain.
- **C5.** Header chips are 30px, not 28, the choice-chip size.
- **C8.** Panel padding is 16px, on the 4px scale; this replaces the earlier 14px. Card 12, row 8 by 10 (8 plus 2).
- **Fraunces headline weight** is 600.
- **The page.** The Proposed page becomes the design system page at `/design-system` in the product. The Today inventory is retired when the build-out ends and stays available until the last step.
- **Calendar end caps.** The approved left-bar exception for agenda rows (`.item`, `.item.ext`, `.item.marker`) and chips (`.chip.ext`, `.chip.marker`) is drawn as a straight, square-ended 3px block, not curved or clipped by the corner radius, and the side it sits on has square corners (the other corners keep their radius). Thomas: "I do not want them rounded like this as that looks sloppy." The Calendar draws the bar today as an inset box-shadow that follows the radius, so the Calendar step of the build-out (step 32, and the markers and day cards steps) must draw it straight.

Written before approval: the sheet below was prepared 2026-10-20 for the morning, because the process was taking too long. The builders made the choices below while drawing. The plan to move the product onto the system is the "Build-out plan (2026-10-20, revised 2026-10-21)" in [plan-design-system](plan-design-system.md); its open questions are all answered there (2026-10-21).

Every item has a code (B3c, C4) so he can answer in one line at the end.

## A. Approved already (8 families)

- **A1 Colour.** Seven base roles, optional status bases, about 45 derived roles; text on a fill picked automatically.
- **A2 Buttons.** Primary, Secondary, Danger, Quiet; 38, 44 and 30px; soft red Danger; one icon button.
- **A3 Fields and forms.** Hairline edge, one focus rule, 38 or 44px, switch 36 by 20, one search field.
- **A4 Typography.** Figtree in nine steps, Fraunces in four; weights 400, 500, 600; one 9px micro count.
- **A5 Tabs and view switches.** Separate rounded tabs, neutral selected fill, scroll overflow.
- **A6 Chips and badges.** 24 and 30px, small corners, neutral selected fill, counts and dots.
- **A7 Cards and rows.** One hairline surface, quiet fills, flat tinted cards, menu slot top-right.
- **A8 Menus and popovers.** One surface, 32 or 44px items, one small shadow, a scrim token.

## B. Drawn and waiting (18 families)

Under each family: what it is, then the choices made while drawing.

**B1 Foundations.** The tokens everything else uses: spacing, shadows, scrim, layers, radius roles, motion, icon sizes, layout ranges.
- B1a Spacing token names: `--space-0` is 2px, `--space-3` is 12px. The older plan table had `--space-3` as 6px. Recommended: approve as drawn.
- B1b A row's 10px padding is written `--space-2` plus `--space-0`. Recommended: approve as drawn.
- B1c Panel padding is drawn at 16 (Menus popovers 14). See C8 for the conflict.
- B1d `--shadow-3` is `0 8px 30px` (dark: black 50%, light: text 18%); `--shadow-1` in light is text 12%. Recommended: approve as drawn.
- B1e The scrim is 55% in light as well as dark. Menus drew 35% in light; that is being fixed. Recommended: approve as drawn.
- B1f A menu (layer 26) sits below a dialog (40), so a menu inside a dialog uses the popover layer (50). The background picker moves from 1000 to the dialog layer and `host.css` from 10000 to the popover layer. Recommended: approve as drawn.
- B1g Easing is `cubic-bezier(0.2, 0, 0, 1)`; reduced motion uses 0.01ms durations. Recommended: approve as drawn.
- B1h Icon tokens 12, 14 and 16 are the type steps. Recommended: approve as drawn.
- B1i `--radius-min` is used only inside a control. Recommended: approve as drawn.
- B1j Four layout ranges: phone, tablet, desktop (901 to 1199), wide. Recommended: approve as drawn.
- B1k The Spotlight icon becomes a solid icon; `fa-expand` stands in. Recommended: approve as drawn.

**B2 Dialogs and sheets.** Editor window, sheets, the styled confirm, the scrim.
- B2a The layout sheet grows from 360 to 560. Recommended: approve as drawn.
- B2b The 42 native `confirm` calls (admin 15, profile 12, the rest in other files) all become the styled confirm, in a step of their own. Recommended: approve as drawn.

**B3 Toasts and banners.**
- B3a Status text mixes danger 70%, ok 40%, warn and info 60% into the text colour. Recommended: approve as drawn.
- B3b The newest toast sits nearest the screen edge; on a phone it is 8px in from each side. Recommended: approve as drawn.
- B3c `.option-help` becomes a banner only when it has `data-kind`. Recommended: approve as drawn.

**B4 Tooltips.** One tooltip look in place of the browser's. Nothing was chosen beyond the drawing. Recommended: approve as drawn.

**B5 Empty, loading and error states.** One empty state and one loading skeleton. It shares the skeleton class with Tables; see C1. Recommended: approve as drawn once C1 is fixed.

**B6 Links.** Text links and reference links.
- B6a `.tag.ref` and Calendar `.links` become Chips tag links, a markup change. Recommended: approve as drawn.

**B7 Pickers.** Colour, icon, date and kind pickers.
- B7a Swatches are rounded squares with a check on a neutral disc. Recommended: approve as drawn.
- B7b The 16-colour palette is data, not design. Recommended: approve as drawn.

**B8 Progress and meters.**
- B8a Every bar has `role="progressbar"`, including the mic level. Recommended: approve as drawn.
- B8b Contrast notes in light mode: ok bars on the page 2.46, the ok presence dot 2.20 to 2.46, the accent bar fill on its track 2.94 (all under 3:1). See C2.

**B9 Avatars and portraits.**
- B9a Initials are snapped to the type scale; the second initial is hidden at 20 and 24px. Recommended: approve as drawn.
- B9b The stack "+N" is a micro count, digits only. Recommended: approve as drawn.

**B10 Choice rows.**
- B10a The segmented `.sdk-choice` folds into the Tabs joined switch. Recommended: approve as drawn.
- B10b `.sdk-check` is not restyled; it becomes the choice row when it is adopted. Recommended: approve as drawn.

**B11 Module window.** Titlebar, toolbar, status line.
- B11a Header chips are 28px, which is not on the Chips scale (24 and 30). See C5.
- B11b The module toolbar surface is `--bg-input`, the same colour as the window today; it separates once Colour moves in. Recommended: approve as drawn.
- B11c The status chip is 20px inside the 24px line; toolbar search is 30px. Recommended: approve as drawn.
- B11d A tinted icon is the tint at 62% into the text colour. Recommended: approve as drawn.

**B12 Chat.**
- B12a Body text 14px; meta text uses a new `--msg-meta` token, because dim text is 4.1:1 on message fills. Recommended: approve as drawn.
- B12b The "..." is always visible; the hover slot is hidden at 640px and below. Recommended: approve as drawn.
- B12c Reactions are 24px Chips tags. Recommended: approve as drawn.
- B12d The attention pill is the gold warn tone, not the accent. Recommended: approve as drawn.

**B13 Journey bar.**
- B13a The "Now" text shows only when the band is 140px wide or more. Recommended: approve as drawn.

**B14 Phone tab bar.**
- B14a The icon is 20px and the tab 45px high. Recommended: approve as drawn.
- B14b The Join icon uses ok 70% into the text colour (plain ok is 2.46:1). Recommended: approve as drawn.
- B14c Folded tabs open a Menus popover. Recommended: approve as drawn.

**B15 Calendar cell.**
- B15a Event chips are 18px inside cells, not the 24px tag. Recommended: approve as drawn.
- B15b Other-calendar chips are not italic, because italics are dropped everywhere (decided 2026-10-21). Recommended: approve as drawn.
- B15c "Linked" is the word for a day opened by a link. Recommended: approve as drawn.
- B15d The current day is the selected fill; today is a label only. Recommended: approve as drawn.

**B16 Markers.**
- B16a Marker words are always `--text`; only the icon takes the marker colour. Recommended: approve as drawn.
- B16b The line chip is 24px with a 20px icon chip. Recommended: approve as drawn.

**B17 Day cards.**
- B17a The date block is the text colour at 8% over the card. Recommended: approve as drawn.
- B17b The day chip is 40px (44 on a phone), with a 7px in-trip dot and a 4px today dot. Recommended: approve as drawn.
- B17c `.gapcount` is drawn in this family. Recommended: approve as drawn.
- B17d The chosen-day number on solid accent is 4.45:1 in light; the Colour auto-picked text on accent fixes it. Recommended: approve as drawn.

**B18 Tables.**
- B18a Hover and selected fills are opaque mixes, so the sticky first column stays solid. Recommended: approve as drawn.
- B18b The member toggle when off is 45% strength. Its name fails 4.5:1, and you specified it. Recommended: approve as drawn.

## C. Where I recommend not approving as drawn, or a real conflict

- **C1 Two skeletons.** Tables and Empty states both define `.sdk-skel`. Being fixed. Recommended: do not approve either family until the fix is in.
- **C2 Low contrast of ok green in light mode.** Ok bars 2.46:1, the ok dot 2.20 to 2.46:1. Recommended: a darker ok mix for non-text uses, so bars and dots reach 3:1. This changes the Progress and Avatars drawings.
- **C3 The wordmark.** The Fraunces 18px wordmark truncates at 390 ("Coffe..."). Recommended: do not approve at 18px at 390; options are a smaller size, a shorter form, or sans there. Yours to choose.
- **C4 Calming Teal.** Its light accent is 2.05:1 on the page and the light OK fill is 2.64:1 against the page. Recommended: do not approve Calming Teal's light mode as it is; the contrast warnings in the theme editor (build-out step 9) will flag it.
- **C5 Header chips.** 28px, between the Chips scale's 24 and 30. Recommended: move them to 30, or to 24, rather than add a size. Yours to choose.
- **C6 Spacing names.** The drawn scale (`--space-3` is 12px) disagrees with the older plan table (`--space-3` is 6px). Recommended: approve the drawn scale and retire the old table. Builders must not use the old numbers.
- **C7 The Proposed page.** It draws about 25 families and is heavy; it is being made to render each family on demand. Not a design decision; no action unless it is still slow.
- **C8 Panel padding.** You decided 14px for a panel, 12 for a card, 8 by 10 for a row. The scale has no 14 or 10, so Foundations draws panel padding at 16 and a row's 10 as 8 plus 2 (Menus popovers stay 14). Recommended: approve 16 for panels and keep the row's 10. This overrides your 14 and is yours to decide.

## Answer in one line

Approve all as drawn except: ____

(For example: "Approve all as drawn except C3, C5 and B11b.")
