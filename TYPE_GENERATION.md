# Type Generation Pipeline

When Core's Zod schemas change, this is how backend and frontend get updated TypeScript types.

## Pipeline

```
biassemble-core                          biassemble/backend              biassemble/frontend
  Zod SSOT                                  fetch from Core                  read Core JSON file
  reflection.schemas.ts  ───→ contracts/reflection.schemas.json
       │                                          │                              │
       │  pnpm generate:contracts                 │  pnpm generate:types          │  pnpm generate:types
       │                                          ▼                              ▼
       │                                 contracts.generated.ts          api.generated.ts
       │                                 (5 interfaces, 70 lines)       (5 interfaces, 70 lines)
       │                                          │                              │
       │                                 contracts.ts                     api.ts
       │                                 (Zod validators +               (imports BiasItem
       │                                  hand-written types)             from generated file)
```

## Core: Zod SSOT → JSON

**Location**: `biassemble-core/`

**Source of Truth**: `src/contracts/reflection.schemas.ts` (Zod schemas)

**Generate JSON**:
```bash
cd biassemble-core
pnpm generate:contracts
```

**Output**: `contracts/reflection.schemas.json` — JSON Schema format, committed to git.

**When**: Run after any change to `reflection.schemas.ts` (add/remove/rename fields, change constraints). Commit the updated JSON.

**Runtime endpoint**: Core serves this file at `GET /v1/contracts` (no auth). Backend fetches it to generate types.

## Backend: JSON → TypeScript types

**Location**: `biassemble/backend/`

**Generate types from Core**:
```bash
cd biassemble/backend
pnpm generate:types
```

**Script**: `scripts/generate-types.ts` — fetches `GET /v1/contracts` from Core, compiles to TypeScript.

**Output**: `src/lib/ai/contracts.generated.ts` — auto-generated TS interfaces (5 interfaces, do not edit).

**How types are used**:
- `src/lib/ai/contracts.ts` — Zod validators (hand-written, SSOT for runtime validation) + re-exports generated types as reference
- `src/lib/ai/core-client.ts` — imports Zod schemas from `contracts.ts` for API response validation
- The generated file serves as a **sync reference** — Zod uses `string[]`, not tuple types, so manual sync is intentional

**When**: Run after Core's JSON has been updated. Commit the updated `contracts.generated.ts`.

## Frontend: JSON → TypeScript types

**Location**: `biassemble/frontend/`

**Generate types from Core JSON**:
```bash
cd biassemble/frontend
pnpm generate:types
```

**Script**: `scripts/generate-types.ts` — reads `biassemble-core/contracts/reflection.schemas.json` directly from disk (offline-safe).

**Output**: `src/types/api.generated.ts` — auto-generated TS interfaces (5 interfaces, do not edit).

**How types are used**:
- `src/types/api.ts` — imports `BiasItem` from `api.generated.ts` and re-exports it
- Other types (`SubmitStoryResponse`, `ResultResponse`, etc.) are backend-specific composites — hand-written in `api.ts`

**When**: Run after Core's JSON has been updated. Commit the updated `api.generated.ts`.

## One-shot update

When you change a Zod schema in Core:

```bash
# 1. Generate JSON from Zod
cd biassemble-core
pnpm generate:contracts
git add contracts/reflection.schemas.json
git commit -m "update contracts JSON"

# 2. Generate backend types
cd ../biassemble/backend
pnpm generate:types
git add src/lib/ai/contracts.generated.ts
git commit -m "regenerate backend types"

# 3. Generate frontend types
cd ../frontend
pnpm generate:types
git add src/types/api.generated.ts
git commit -m "regenerate frontend types"
```

## What gets generated

All scripts produce the same 5 interfaces from Core's Zod schemas:

| Interface | What it describes |
|-----------|-------------------|
| `GenerateQuestionRequest` | POST /v1/reflection/question body |
| `GenerateAssessmentRequest` | POST /v1/reflection/assessment body |
| `QuestionOutput` | Question generation response |
| `AssessmentOutput` | Assessment response (biases + reflectionPrompt) |
| `BiasItem` | Single bias (name, explanation, storyConnection, alternativePerspective) |

## Safety

Generated files contain only data shapes — no AI prompts, model IDs, API keys, or internal architecture. Safe to commit to public repositories.