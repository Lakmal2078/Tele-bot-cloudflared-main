/** Small form primitives shared by the operations pages. */

import { esc } from "./ui";

export interface TextFieldOptions {
  type?: "text" | "password" | "url" | "number";
  placeholder?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  autocomplete?: string;
  maxLength?: number;
}

export function textField(
  name: string,
  label: string,
  value: string,
  options: TextFieldOptions = {}
): string {
  const type = options.type || "text";
  const attrs = [
    `type="${type}"`,
    `name="${esc(name)}"`,
    `id="field-${esc(name)}"`,
    `value="${esc(value)}"`,
    options.placeholder ? `placeholder="${esc(options.placeholder)}"` : "",
    options.required ? "required" : "",
    options.disabled ? "disabled" : "",
    options.autocomplete ? `autocomplete="${esc(options.autocomplete)}"` : "",
    options.maxLength ? `maxlength="${options.maxLength}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<div class="field">
    <label for="field-${esc(name)}">${esc(label)}</label>
    <input ${attrs} />
    ${options.hint ? `<span class="hint">${esc(options.hint)}</span>` : ""}
  </div>`;
}

export function secretField(
  name: string,
  label: string,
  options: { saved: boolean; hint?: string; disabled?: boolean } = { saved: false }
): string {
  return `<div class="field">
    <label for="field-${esc(name)}">${esc(label)}</label>
    <input type="password" id="field-${esc(name)}" name="${esc(name)}" autocomplete="new-password" value="" ${
      options.disabled ? "disabled" : ""
    } placeholder="${options.saved ? "•••••••• (saved — leave blank to keep)" : "Not set"}" />
    <span class="hint">${esc(
      options.hint ||
        "Encrypted with AES-GCM before it is stored. It is never shown again after saving."
    )}</span>
  </div>`;
}

export function selectField(
  name: string,
  label: string,
  value: string,
  options: Array<{ value: string; label: string }>
): string {
  const items = options
    .map(
      (option) =>
        `<option value="${esc(option.value)}"${option.value === value ? " selected" : ""}>${esc(option.label)}</option>`
    )
    .join("");
  return `<div class="field">
    <label for="field-${esc(name)}">${esc(label)}</label>
    <select id="field-${esc(name)}" name="${esc(name)}">${items}</select>
  </div>`;
}

export function submitButton(label: string, className = "btn primary"): string {
  return `<button class="${className}" type="submit">${esc(label)}</button>`;
}
