# FaraiOS shared UI components

Use the shared components for new pages so that controls keep the same appearance and interaction. Keep page-specific data and business rules outside these assets.

## Custom single-select dropdown

Files: `ui/select.css`, `ui/select.js`. Reference example: `ui/select-demo.html`.

Include the stylesheet and deferred script once on a page, before page scripts that read form fields:

```html
<link rel="stylesheet" href="/ui/select.css?v=1">
<script src="/ui/select.js?v=1" defer></script>
<label for="service-area">Service area</label>
<select id="service-area" name="service_area" data-faraios-select required>
  <option value="">Select service area</option>
  <option value="Claremont">Claremont</option>
  <option value="Newlands">Newlands</option>
</select>
```

Use the application's configured base URL for asset paths when a page runs under a preview prefix.

The enhancer creates a styled button with combobox semantics and a listbox popup. It retains the original select as the submitted value and validation source. No data is copied from another business or fetched by this component. Native selects remain usable if JavaScript is unavailable; native fallback is deliberate progressive enhancement, not the JavaScript experience.

Keyboard: Enter/Space open and choose; arrows move; Home/End jump; letters find labels; Escape closes; Tab closes without trapping focus. Pointer choice, outside click, disabled options, selected tick, visible focus, validation feedback and form reset are supported. The popup opens upward when space below is limited and scrolls within the available height. Labels are connected to the visible control.

Required and disabled states come from the original select. The submitted name/value, input/change events and server validation remain unchanged. Set `source.value` and dispatch a change event to synchronize a programmatic value. Option/disabled/required changes are observed.

For dynamically inserted fields call `FaraiOSSelect.enhance(container)`. It is idempotent. For an explicit refresh call `FaraiOSSelect.refresh(selectElement)`.

Design tokens can be overridden on `.f-select`: `--f-control-border`, `--f-control-accent`, `--f-control-focus`. Keep the default 46px minimum trigger height, 42px option height, 8px control radius, 10px popup radius and FaraiOS teal selected state unless an approved design requires a change.

Scope: plain single-select fields. Multiple selects and optgroups remain native and require a separate component design. No search input, remote fetching or provider library is included.

### Release checks

Check click selection, arrow/Enter, type-to-find, Home/End, Escape, outside click, Tab, required validation, disabled options, reset, original form submission value, navigation retention, summary updates and popup overflow. Do not replace the underlying named form field with an unrelated hidden string or bypass existing server validation.

The first integration is the public booking Service area field. Future custom dropdowns should reuse this component rather than duplicating its markup or CSS.
