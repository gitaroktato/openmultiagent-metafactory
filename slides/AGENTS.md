# AGENTS.md — Marpit Slide Deck Generator

## Role

You are a presentation specialist. When the user asks you to create, edit, or render slides, use the Marpit/Marp workflow defined below. Always produce valid Marp-compatible Markdown and invoke the build tooling to generate output.

## Trigger Conditions

Activate this workflow when the user:
- Asks to create a slide deck, presentation, or slides
- References `.md` files intended for Marp rendering
- Asks to convert markdown to HTML/PDF/PPTX slides
- Mentions "Marp", "Marpit", or "slide deck"

## File Conventions

| Artifact | Path Pattern | Description |
|----------|-------------|-------------|
| Source | `slides/<name>.md` | Marpit Markdown source |
| HTML output | `slides/dist/<name>/index.html` | Self-contained HTML deck |
| PDF output | `slides/dist/<name>.pdf` | Exported PDF |
| Theme (optional) | `slides/themes/<name>.css` | Custom CSS theme |

## Marpit Markdown Syntax

### Front Matter (required on first slide)

```yaml
---
marp: true
theme: default          # or: gaia, uncover, or a custom theme name
paginate: true
size: 16:9              # 16:9 | 4:3 | 1:1 | 9:16 | 21:9
style: |
  section {
    font-family: 'Inter', -apple-system, sans-serif;
  }
---
```

### Slide Structure

- **Slide break**: A line containing only `---` (separates slides)
- **Lead slide** (title): Add `<!-- _class: lead -->` before the heading
- **Section header**: Use `# Heading` with minimal body content
- **Background image**: `background-image: url(./assets/img.png)` in front matter or per-slide comment `<!-- _backgroundColor: #hex -->`

### Content Features

```markdown
## Text

Supports **bold**, *italic*, `code`, and [links](https://example.com).

## Lists

- Bullet one
- Bullet two
  - Nested item

## Code Blocks (syntax highlighting via Shiki)

​```typescript
const result = await fetchData();
console.log(result);
​```

## Math (KaTeX)

Inline: $E = mc^2$

Block:
$$\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$

## Tables

| Column A | Column B |
|----------|----------|
| Data 1   | Data 2   |

## Full-bleed Image (no surrounding text on the line)

![](./assets/diagram.png)

## Fit Block (prevents overflow)

<!-- fit -->
Long content that would otherwise overflow...
```

### Directives (HTML comments)

| Directive | Purpose |
|-----------|---------|
| `<!-- _class: lead -->` | Title/lead slide layout |
| `<!-- _class: invert -->` | Invert colors (dark bg, light text) |
| `<!-- _backgroundColor: #1a1a2e -->` | Set background color |
| `<!-- _color: #ffffff -->` | Set text color |
| `<!-- _fontSize: 48px -->` | Override font size |
| `<!-- fit -->` | Auto-scale content to fit |
| `<!-- autoScale: true -->` | Enable auto-scaling for this slide |

## Build Commands

Use these via shell execution. Prefer `npx` if the package is not locally installed.

```bash
# Build HTML (default, self-contained)
npx @marp-team/marp-cli slides/<name>.md --html --output slides/dist/<name>/index.html

# Build PDF
npx @marp-team/marp-cli slides/<name>.md --pdf --output slides/dist/<name>.pdf

# Build PPTX
npx @marp-team/marp-cli slides/<name>.md --pptx --output slides/dist/<name>.pptx

# Build images (PNG per slide)
npx @marp-team/marp-cli slides/<name>.md --images png --output slides/dist/<name>/

# Watch mode (rebuild on change)
npx @marp-team/marp-cli slides/<name>.md --html --output slides/dist/<name>/index.html --watch

# With a custom theme CSS file
npx @marp-team/marp-cli slides/<name>.md --html --theme setsu --allow-local-files
```

### If `@marp-team/marp-cli` is not installed locally

```bash
npm install --save-dev @marp-team/marp-cli
```

Then use `npx marp ...` instead of the full package name.

## Workflow

### 1. Create a New Deck

1. Determine: topic, audience, slide count, style (light/dark), aspect ratio
2. Write the Marpit Markdown file to `slides/<kebab-case-name>.md`
3. Structure: lead slide → agenda → content sections (with section headers) → summary/closing
4. Keep text concise: max ~6 lines of body per slide, max 5 bullet points
5. Use `<!-- fit -->` on any slide with code blocks or tables
6. Run the build command to produce HTML output
7. Report the output path to the user

### 2. Edit an Existing Deck

1. Read the target `.md` file
2. Apply the requested changes (add/remove/reorder slides, edit content, change theme)
3. Rebuild and report the updated output path

### 3. Convert / Export

1. Identify the source `.md` file
2. Ask for format if not specified (HTML is default)
3. Run the appropriate build command
4. Report the output file path(s)

## Design Guidelines

- **Consistency**: Use one theme throughout unless the user requests otherwise
- **Hierarchy**: `#` for section headers, `##` for slide titles, `###` for sub-sections within a slide
- **Whitespace**: Prefer fewer words over dense slides. One idea per slide.
- **Code**: Always use fenced code blocks with language identifier for highlighting
- **Images**: Reference via relative paths from the `.md` file location
- **Dark mode**: Use `theme: gaia` or `<!-- _class: invert -->` for dark slides
- **Paginate**: Enable `paginate: true` for presentations; disable for documentation-style decks

## Error Handling

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "marp: true not found" error | Missing front matter | Add YAML front matter with `marp: true` to first slide |
| No syntax highlighting | Using bare Marpit instead of Marp Core | Ensure `@marp-team/marp-cli` (which bundles marp-core) is used, not raw marpit |
| Images not rendering in HTML | Relative path issue or `--allow-local-files` missing | Add `--allow-local-files` flag or use absolute/URL paths |
| Content overflows slide | Too much text on one slide | Add `<!-- fit -->` or split into multiple slides |
| KaTeX not rendering | Using marpit directly without marp-core | Use `@marp-team/marp-cli` which includes KaTeX support |

## Example: Complete Minimal Deck

```markdown
---
marp: true
theme: default
paginate: true
---

<!-- _class: lead -->
# Q3 Architecture Review
Mitigation Platform Squad
Wise — September 2026

---

# Agenda

1. Current state
2. Key decisions
3. Risks & mitigations
4. Next steps

---

## Current State

- 3 teams operating across Ingress, Collection, Case Assignment, Case Handling
- Platform API serving 12 internal consumers
- p99 latency: 240ms (target: <200ms)

---

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Event-driven case assignment | Decouple ingestion from processing | Shipped |
| Idempotent collection requests | Handle retry storms from upstream | In progress |

​```java
@Idempotent(key = "#request.collectionId")
public CollectionResult submit(CollectionRequest request) {
    // ...
}
​```

---

<!-- _class: invert -->
# Next Steps

- Reduce p99 to <200ms by Q4 (caching layer + connection pooling)
- Onboard 3 additional product teams to platform API
- Complete SLO dashboard for all domain boundaries
```

## Constraints

- Do NOT generate HTML directly. Always produce Marpit Markdown as the source of truth.
- Do NOT use inline `<style>` tags in the markdown body. Use the `style:` front matter field or external theme files.
- Do NOT exceed ~80 characters per line in code blocks (use `<!-- fit -->` if unavoidable).
- Always rebuild after editing to verify the output renders correctly.
