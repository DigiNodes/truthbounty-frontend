# TruthBounty V2 Design System

**Status:** Implementation baseline  
**Accessibility target:** WCAG 2.2 AA

## Principles

- Evidence before decoration.
- Risk and transaction state remain visible.
- Colour never carries meaning alone.
- Protocol terminology is consistent across screens.
- Destructive or irreversible actions require explicit review.

## Token architecture

Tokens must be defined as CSS variables and mapped through Tailwind. Components may not introduce arbitrary product colours, spacing or shadows when a semantic token exists.

### Semantic colours

Required roles:

- canvas, surface, elevated surface;
- primary/secondary text and muted text;
- action, action-hover and focus;
- success, warning, danger and information;
- pending, confirmed, finalized and orphaned;
- border, divider and disabled.

Every foreground/background pair must pass the applicable WCAG contrast requirement in supported themes.

### Type

Use a limited scale with semantic roles: display, page title, section title, body, small body, label, code and data. Token/amount/identifier displays use tabular numerals where supported.

### Spacing and layout

Use a 4px base scale. Interactive targets are at least 44×44 CSS pixels. Content width, gutters and breakpoints are centralized tokens.

## Core components

- Button, icon button and link.
- Input, textarea, select, combobox and amount input.
- Checkbox, radio, switch and segmented choice.
- Alert, banner, toast and inline validation.
- Dialog, drawer, popover and tooltip.
- Tabs, breadcrumb, pagination and skip link.
- Card, data table, definition list and timeline.
- Wallet control and network badge.
- Claim status, finality badge and projection freshness.
- Transaction review, progress and recovery panel.
- Evidence card and external-content warning.
- Token amount, address and transaction reference.

## Component contract

Every interactive component documents:

- variants and semantic use;
- keyboard behaviour;
- focus entry/exit;
- accessible name/description;
- loading, disabled and error states;
- mobile and large-text behaviour;
- analytics/privacy constraints;
- unit, accessibility and Storybook coverage.

## Prohibited patterns

- fabricated success, hashes, gas or rewards;
- inaccessible custom controls;
- colour-only status;
- placeholder production addresses;
- unbounded animation;
- disabled buttons without an accessible explanation;
- raw wallet/RPC errors shown directly to users;
- importing test mocks into production modules.
