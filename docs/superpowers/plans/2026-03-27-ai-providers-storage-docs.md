# Phase 2 AI Providers and Storage Docs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Phase 2 refactoring docs so `docs/refactoring/02-ai-providers-storage.md` matches the Phase 1 document standard and add a new `docs/refactoring/02-ai-providers-storage-spec.md` that captures the approved package-level design.

**Architecture:** Keep the implementation strictly at the documentation layer. Update the Phase 2 stage doc to define scope, non-goals, key decisions, delivery items, and acceptance criteria, then add a companion spec doc that separates shared rules from the detailed `@toonflow/ai-providers` and `@toonflow/storage` package constraints. Preserve terminology and dependency direction from the approved design spec and `architecture-overview.md`.

**Tech Stack:** Markdown, pnpm monorepo documentation, existing refactoring docs under `docs/refactoring/`

---

## File Structure

### Reference files

- `docs/superpowers/specs/2026-03-27-ai-providers-storage-design.md`
- `docs/refactoring/architecture-overview.md`
- `docs/refactoring/01-database-layer.md`
- `docs/refactoring/01-database-layer-spec.md`

### Files to create

- `docs/refactoring/02-ai-providers-storage-spec.md`

### Files to modify

- `docs/refactoring/02-ai-providers-storage.md`

### Constraints

- Do not change package code, workspace config, or tests in this plan.
- Do not add implementation details that contradict the approved design spec.
- Keep Phase 2 scoped to documentation for `@toonflow/ai-providers` and `@toonflow/storage`.

### Task 1: Reshape The Phase 2 Stage Doc

**Files:**
- Modify: `docs/refactoring/02-ai-providers-storage.md`
- Reference: `docs/refactoring/01-database-layer.md`
- Reference: `docs/superpowers/specs/2026-03-27-ai-providers-storage-design.md`

- [x] **Step 1: Compare the current Phase 2 doc against the Phase 1 structure**

Run:

```bash
rg -n "^## " docs/refactoring/01-database-layer.md docs/refactoring/02-ai-providers-storage.md
```

Expected:
- `01-database-layer.md` shows a full phase-doc structure such as `定位` / `目标` / `范围` / `非目标` / `关键决策` / `交付物` / `验收标准`
- `02-ai-providers-storage.md` is visibly missing several of those sections

- [x] **Step 2: Replace the current top-level outline with the Phase 1 style headings**

Rewrite `docs/refactoring/02-ai-providers-storage.md` so it uses this exact top-level skeleton:

```md
# Phase 2: AI Provider 与存储层提取 (`@toonflow/ai-providers` + `@toonflow/storage`)

## 定位
## 目标
## 范围
## 非目标
## 关键决策
## 集成方式
## 交付物
## 验收标准
## 风险与注意事项
```

- [x] **Step 3: Fill `定位` / `目标` / `范围` / `非目标` from the approved design**

Required content to include:

```md
- Phase 2 is the infrastructure stage after `@toonflow/db`, not an API utility refactor
- `@toonflow/ai-providers` and `@toonflow/storage` are standalone workspace packages
- `text + image + local storage` are the minimum executable baseline
- `video` and `S3-compatible storage` stay as defined extension points
- configuration persistence, provider routing strategy, and object storage implementation are out of scope
```

- [x] **Step 4: Fill `关键决策` / `集成方式` / `交付物` / `验收标准` / `风险与注意事项`**

The doc must explicitly lock these decisions:

```md
- both packages are consumed via explicit construction and dependency injection
- `@toonflow/ai-providers` accepts structured config objects and does not own config persistence
- `TextProvider` supports both `invoke()` and `stream()`
- `@toonflow/storage` requires a real `local storage` implementation first
- errors should reuse `@toonflow/kernel` semantics where possible
```

Also add a delivery section that points to `docs/refactoring/02-ai-providers-storage-spec.md`.

- [x] **Step 5: Verify the stage doc structure and terminology**

Run:

```bash
rg -n "^## " docs/refactoring/02-ai-providers-storage.md
rg -n "@toonflow/ai-providers|@toonflow/storage|stream|local storage|S3-compatible" docs/refactoring/02-ai-providers-storage.md
```

Expected:
- all required headings exist once
- package names use the `@toonflow/*` form consistently
- the approved baseline terms appear in the doc

- [x] **Step 6: Commit the stage doc rewrite**

```bash
git add docs/refactoring/02-ai-providers-storage.md
git commit -m "docs: rewrite phase 2 refactoring overview"
```

### Task 2: Create The Shared Spec Skeleton

**Files:**
- Create: `docs/refactoring/02-ai-providers-storage-spec.md`
- Reference: `docs/refactoring/01-database-layer-spec.md`
- Reference: `docs/superpowers/specs/2026-03-27-ai-providers-storage-design.md`

- [x] **Step 1: Create the new spec file with the approved high-level structure**

Add this exact top-level skeleton to `docs/refactoring/02-ai-providers-storage-spec.md`:

```md
# `@toonflow/ai-providers` 与 `@toonflow/storage` 详细设计说明

## 1. 文档目的
## 2. 设计目标
## 3. 非目标
## 4. 包边界与依赖规则
## 5. 建议目录结构
## 6. 公共 API 设计
## 7. 配置与运行方式
## 8. `@toonflow/ai-providers` 设计
## 9. `@toonflow/storage` 设计
## 10. 错误模型设计
## 11. 测试与验证基线
## 12. 实施范围与衔接
```

- [x] **Step 2: Write sections `1` through `7` before package-specific sections**

These shared sections must cover:

```md
- the document purpose and relationship to `02-ai-providers-storage.md`
- design goals and non-goals
- allowed and forbidden dependencies
- the rule that both packages are peers under `packages/`
- public API discipline and explicit injection
- structured config inputs instead of package-internal `process.env` access
```

- [x] **Step 3: Verify the spec scaffold exists and is readable**

Run:

```bash
rg -n "^## " docs/refactoring/02-ai-providers-storage-spec.md
sed -n '1,220p' docs/refactoring/02-ai-providers-storage-spec.md
```

Expected:
- all planned top-level sections exist
- shared rules are present before package-specific sections

- [x] **Step 4: Commit the spec skeleton**

```bash
git add docs/refactoring/02-ai-providers-storage-spec.md
git commit -m "docs: scaffold phase 2 detailed spec"
```

### Task 3: Fill The `@toonflow/ai-providers` Spec

**Files:**
- Modify: `docs/refactoring/02-ai-providers-storage-spec.md`
- Reference: `docs/superpowers/specs/2026-03-27-ai-providers-storage-design.md`

- [x] **Step 1: Write the `@toonflow/ai-providers` responsibility and baseline sections**

The package section must explicitly state:

```md
- responsibilities: text/image/video abstraction, vendor adaptation, registry, unified request/response/stream semantics
- not responsible for config persistence, routing policy, workflow orchestration, or transport layers
- baseline: real implementations for `text` and `image`; `video` is interface-and-registry only
```

- [x] **Step 2: Add the recommended directory layout and public API surface**

Include a code block equivalent to:

```text
packages/ai-providers/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── registry/
│   ├── errors/
│   ├── text/
│   ├── image/
│   ├── video/
│   └── providers/
│       └── <vendor>/
```

Then list the stable exports:

```md
- `createAiProviderRegistry(...)`
- `AiProviderRegistry`
- `TextProvider`
- `ImageProvider`
- `VideoProvider`
- request / result / stream chunk types
```

- [x] **Step 3: Add config, registry wiring, and `stream()` behavior requirements**

Required details:

```md
- provider package accepts structured config objects
- edge parsers may convert env to config, but do not choose business defaults
- `TextProvider.stream()` is a real Phase 2 requirement
- streaming uses a provider-neutral async-consumption model
- vendor SDK event shapes must not leak into public API
```

- [x] **Step 4: Verify the AI provider section covers the approved baseline**

Run:

```bash
rg -n "TextProvider|ImageProvider|VideoProvider|stream|registry|video" docs/refactoring/02-ai-providers-storage-spec.md
```

Expected:
- `TextProvider`, `ImageProvider`, and `VideoProvider` all appear
- the text/image/video baseline is explicit
- `stream()` behavior is described in prose, not just named in an interface list

- [x] **Step 5: Commit the AI provider spec content**

```bash
git add docs/refactoring/02-ai-providers-storage-spec.md
git commit -m "docs: define ai providers phase 2 spec"
```

### Task 4: Fill The `@toonflow/storage` Spec And Shared Validation Sections

**Files:**
- Modify: `docs/refactoring/02-ai-providers-storage-spec.md`
- Reference: `docs/superpowers/specs/2026-03-27-ai-providers-storage-design.md`

- [ ] **Step 1: Write the `@toonflow/storage` responsibility and baseline sections**

The section must explicitly state:

```md
- responsibilities: read/write, existence checks, delete, directory delete, base64 reads, URL generation
- not responsible for business directory planning, permissions, upload transport, or orchestration
- baseline: `local storage` is required; `S3-compatible storage` remains an extension point
```

- [ ] **Step 2: Add the directory layout, public API, and config/pathing rules**

Include a code block equivalent to:

```text
packages/storage/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── errors/
│   ├── pathing/
│   └── adapters/
│       ├── local/
│       └── s3/
```

And describe the minimum adapter contract:

```md
- `writeFile(path, data)`
- `getFile(path)`
- `getImageBase64(path)`
- `getFileUrl(path)`
- `fileExists(path)`
- `deleteFile(path)`
- `deleteDirectory(path)`
```

The pathing rules must state that storage paths stay inside `rootDir` and URL generation is based on explicit config.

- [ ] **Step 3: Write sections `10` through `12` for error model, testing, and implementation handoff**

Required content:

```md
- provider and storage errors are normalized, not raw SDK/Node exceptions
- `@toonflow/kernel` is the preferred home for shared error semantics
- AI tests focus on registry/contract/stub behavior, not default live vendor calls
- storage tests exercise real local filesystem behavior
- implementation scope is limited to rewriting `02-ai-providers-storage.md` and adding `02-ai-providers-storage-spec.md`
```

- [ ] **Step 4: Verify there are no placeholders or missing baseline terms**

Run:

```bash
rg -n "TODO|TBD|待定|占位|稍后|to be decided" docs/refactoring/02-ai-providers-storage.md docs/refactoring/02-ai-providers-storage-spec.md
rg -n "local storage|S3-compatible|invoke|stream|explicit|dependency injection" docs/refactoring/02-ai-providers-storage-spec.md
```

Expected:
- no placeholder text remains
- the agreed baseline terms appear in the detailed spec

- [ ] **Step 5: Commit the storage and validation sections**

```bash
git add docs/refactoring/02-ai-providers-storage-spec.md
git commit -m "docs: complete storage and validation phase 2 spec"
```

### Task 5: Run A Final Cross-Doc Consistency Pass

**Files:**
- Modify: `docs/refactoring/02-ai-providers-storage.md`
- Modify: `docs/refactoring/02-ai-providers-storage-spec.md`
- Reference: `docs/refactoring/architecture-overview.md`
- Reference: `docs/superpowers/specs/2026-03-27-ai-providers-storage-design.md`

- [ ] **Step 1: Compare terminology and dependency direction across all relevant docs**

Run:

```bash
rg -n "@toonflow/ai-providers|@toonflow/storage|services|dependency injection|local storage|S3-compatible|stream" \
  docs/refactoring/architecture-overview.md \
  docs/refactoring/02-ai-providers-storage.md \
  docs/refactoring/02-ai-providers-storage-spec.md \
  docs/superpowers/specs/2026-03-27-ai-providers-storage-design.md
```

Expected:
- package names, dependency direction, and baseline terms line up across the four docs

- [ ] **Step 2: Resolve any wording drift or contradictory scope statements**

Typical corrections to make if found:

```md
- use `@toonflow/*` package names in prose where package identity matters
- keep `video` and `S3-compatible storage` as extension points, not Phase 2 must-haves
- keep provider config persistence and routing strategy out of package responsibilities
```

- [ ] **Step 3: Run final document integrity checks**

Run:

```bash
git diff --check -- docs/refactoring/02-ai-providers-storage.md docs/refactoring/02-ai-providers-storage-spec.md
git diff -- docs/refactoring/02-ai-providers-storage.md docs/refactoring/02-ai-providers-storage-spec.md
```

Expected:
- no whitespace or patch-format issues
- the final diff only touches the two intended refactoring docs

- [ ] **Step 4: Commit the finalized documentation set**

```bash
git add docs/refactoring/02-ai-providers-storage.md docs/refactoring/02-ai-providers-storage-spec.md
git commit -m "docs: finalize phase 2 ai providers and storage docs"
```
