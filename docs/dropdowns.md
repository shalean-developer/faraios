# Reusable custom dropdown

Owner request, 19 October 2026: replace the native Business view picker with a reusable custom control. Used on the real staging workspace and catalogue item type, pricing model and status fields.

Mark a labelled, single-choice HTML select with `data-dropdown` and give it a unique ID. Load `/dropdown.js` as a module and the shared stylesheet. The module retains the select as the form value and enhances it once. Without JavaScript, the original select remains usable. Disabled and multiple selects are left native.

The custom combobox supplies a listbox, selection state, label association, keyboard navigation (arrows, Home/End, Enter/Space, Escape, Tab), typeahead, pointer selection, outside dismissal and reset/required-field handling. Choosing updates the underlying select and emits input/change. Business view still requires Apply; opening or navigating options does not submit the form.

Only same-origin external scripts are allowed by the local staging server CSP. No inline handlers, dependencies, database or pricing changes. Automated interaction tests cover keyboard commit/cancel, typeahead, native selection, validation, reset and duplicate enhancement. Real browser visual/mobile acceptance remains pending until the owner pulls and restarts the local app.
