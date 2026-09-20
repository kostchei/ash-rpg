# Gap closure plan: reaching Jev-class behaviour

Status: **proposed**. This document records the three substantive gaps between the
current JAH decision stack and the Jev reference system, and the work planned to
close or consciously accept each one.

Scope note: the three gaps are independent. Gap 2 is a correctness gate and blocks
release. Gap 1 is a capability gap and is scheduled as a research workstream. Gap 3
is a design difference that we intend to keep, with hardening rather than replacement.

| # | Gap | Severity | Disposition | Effort |
| --- | --- | --- | --- | --- |
| 1 | Generalization without per-task adaptation | High | Close over two quarters | High |
| 2 | Optimization equivalence under cuBLAS GEMM reduction | Blocking | Close now | Moderate |
| 3 | Native RLCD vs post-hoc calibration | Low | Accept and harden | Low |

---

## Gap 1 — Generalization without per-task adaptation

### Current position

| | Jev | JAH today |
| --- | --- | --- |
| Backbone | Foundation model trained across classification, intent-routing and tabular-judgment corpora | General-purpose chat backbone (`Qwen/Qwen3.5-4B`) |
| Novel task handling | Zero-shot over arbitrary runtime candidate descriptions | Per-task LoRA head required for rubric-heavy tasks |
| Measured behaviour | — | `banking77` (intent) and `wikiqa` (factuality) are reliable zero-shot; ASAP essay scoring collapses to ≈35% zero-shot |

The failure mode is specific rather than general: the backbone handles well-posed
label sets, but does not reliably *interpret a rubric supplied at runtime*. Every
rubric-bearing task currently costs a training cycle, a LoRA artifact, and a
calibration split before it can ship.

### Plan

**Phase 1A — Diagnosis before training (2 weeks).**
Separate "cannot read the rubric" from "can read the rubric, cannot map it to an
ordinal scale". Build a probe set of 8–12 tasks spanning nominal labels, ordinal
rubrics, and free-form candidate descriptions. Score each with (a) bare zero-shot,
(b) rubric restated as an explicit decision tree, (c) 8-shot in-context. If (b) or
(c) recovers most of the ASAP gap, the cheaper prompt-and-retrieval route in Phase
1B may be sufficient and Phase 1C can be deferred.

**Phase 1B — Rubric conditioning layer (4 weeks).**
A single canonical decision prompt schema — task statement, candidate description,
enumerated options with their criteria, and an explicit tie-break rule — rendered
identically at train and serve time. Add a rubric exemplar store: for each deployed
task, retrieve k nearest adjudicated examples and inject them. This is per-task
*data*, not per-task *weights*, so it costs no training cycle and no new artifact
to onboard a task.

**Phase 1C — Multi-task decision tuning of the backbone (one quarter).**
If Phase 1A shows a genuine capability gap, fine-tune across a broad mixture of
classification, ranking and NLI corpora — GLUE, SuperGLUE, MASSIVE, Banking77,
ASAP-style ordinal rubrics, and internal adjudicated traffic — all rendered in the
Phase 1B schema. Requirements:

- Held-out *task* split, not just a held-out row split. Generalization is measured
  only on task families absent from training.
- Mixture weights capped per family so intent routing does not dominate.
- Rubric paraphrase and option-order shuffling as augmentation, to prevent the model
  keying on surface form or position.
- Retain the LoRA path as a documented escalation for tasks that remain below gate.

**Acceptance gates.**

- Zero-shot ASAP quadratic-weighted kappa within 0.05 of the task-specific LoRA head.
- No regression beyond 1 point absolute on `banking77` or `wikiqa`.
- On three held-out task families never seen in training, zero-shot accuracy at or
  above 85% of the tuned-head result.
- Onboarding a new task requires no weight training — configuration and exemplars only.

**Risks.** Multi-task tuning can flatten calibration, which the Gap 3 post-hoc layer
then has to re-fit per task; calibration artifacts must be regenerated and re-gated
after every backbone change. A 4B backbone may simply lack the capacity for
zero-shot rubric interpretation, in which case the decision is a larger backbone
versus keeping the LoRA registry — record that as an ADR rather than drifting into it.

---

## Gap 2 — Optimization equivalence under cuBLAS GEMM reduction

### Current position

Batching multiple questions together, or reusing prefix KV state, changes the GEMM
reduction order cuBLAS selects. Floating-point addition is not associative, so the
reduction order is part of the numerics. In BF16 this produces a 1–2 ULP logit shift
(0.0625–0.125 at the observed magnitudes). For near-tied options that propagates to
a probability delta as large as Δp = 0.0897, which fails the ADR-03 equivalence gate
of max Δp ≤ 0.01.

This is not a bug in the sampler. It is a gate specified against an invariant that
BF16 batched inference does not provide.

### Plan

**Step 2A — Force FP32 accumulation on the decision path.**
Set `torch.backends.cuda.matmul.allow_bf16_reduced_precision_reduction = False`
(and the fp16 equivalent) so reductions accumulate in FP32 while inputs stay BF16.
Pin the value in the serving entrypoint, not in a notebook or a test fixture, and
assert it at startup so a config drift fails loudly instead of silently widening
the spread. Measure the throughput cost and record it; if it exceeds roughly 10%,
raise the trade-off explicitly rather than absorbing it.

**Step 2B — Margin-aware equivalence gate.**
Amend ADR-03. The current gate asserts probability equivalence for every decision,
including decisions that are genuine ties. Replace it with:

- **Decision equivalence (hard).** For every case where the top-1 logit margin
  exceeds an empirically derived ULP threshold — 2 ULPs as the working value, to be
  confirmed against the measured distribution — argmax must match the reference
  exactly. Zero tolerance.
- **Probability equivalence (bounded).** Over the same set, max Δp ≤ 0.01.
- **Tie band (reported, not gated).** Cases inside the margin threshold are counted
  and reported, not failed. A rise in tie-band population is itself a signal and gets
  its own alert threshold.

The ULP threshold is derived from measurement, not assumed: sweep batch sizes and
prefix-reuse configurations, record the empirical logit-shift distribution, and set
the threshold above its observed maximum with margin.

**Step 2C — Lock it down in CI.**
A determinism suite that runs the same decision set at batch sizes 1, 8 and 32,
with and without prefix KV reuse, and asserts the three conditions above. It runs on
every change to the sampler, the batching layer, the serving config, or the CUDA and
PyTorch version pins. Version pins are part of the numerics contract, so a bump is a
gated change rather than a routine dependency update.

**Acceptance gates.**

- Zero argmax flips outside the tie band across the full batch and prefix sweep.
- max Δp ≤ 0.01 outside the tie band.
- Tie-band population recorded per release, with a change alert.
- ADR-03 amended and merged before the gate is relied on. No silent tolerance widening.

**Explicitly rejected alternatives.** Loosening max Δp to 0.09 to make the existing
gate pass — it would mask real regressions. Serving at batch size 1 to sidestep the
problem — it trades a measurable numerical question for an unacceptable throughput loss.

---

## Gap 3 — Native RLCD vs post-hoc calibration

### Current position

Jev pushes calibration into the weights during pre-training via RLCD, so logits
approximate true posteriors P(Y|X). JAH fits a temperature T and bias vector b on a
held-out calibration split after training, and guards accepted error with exact
one-sided Clopper-Pearson bounds.

### Assessment: keep the current approach

For enterprise deployment the post-hoc route is the more defensible one, and this is
a deliberate choice rather than a shortfall:

- It yields an **exact** one-sided 95% upper bound on accepted error (≤5% error at
  ≥50% coverage), not an empirical estimate.
- Calibration artifacts are versioned, inspectable and independently re-fittable.
- Recalibration after a data shift costs a calibration split, not a training run.
- RLCD makes calibration an opaque property of the weights. It cannot be audited,
  re-derived on customer data, or pointed at in a compliance review.

The work here is hardening what we have, not replacing it.

**Step 3A — Artifact discipline.** Every calibration artifact carries backbone hash,
LoRA hash (where applicable), calibration split identifier, fit date, and the
resulting coverage and error bound. Serving refuses to start on a backbone/artifact
mismatch — no fallback to uncalibrated logits, no implicit default.

**Step 3B — Drift monitoring.** Track realized coverage and realized error against
the Clopper-Pearson bound per task, per release. Alert when realized error
approaches the bound or when coverage falls, and treat either as a recalibration
trigger.

**Step 3C — Recalibration runbook.** A documented, repeatable procedure covering
when to refit, what split size the bound requires for the target confidence, and who
signs off. Recalibration is triggered by any backbone change, including everything
in Gap 1.

**Step 3D — Watch, do not build.** Revisit calibration-aware fine-tuning only if
post-hoc calibration stops holding — specifically, if a single (T, b) pair cannot
achieve the target bound across the task mix after the Gap 1 multi-task tuning. That
is the trigger condition; until it fires, this line of work stays closed.

---

## Sequencing

| Order | Work | Blocking? | Rationale |
| --- | --- | --- | --- |
| 1 | Gap 2 (all steps) | Yes | Correctness gate; everything measured before it is measured on shifting numerics |
| 2 | Gap 3A–3C | No | Cheap, and makes the Gap 1 evaluation trustworthy |
| 3 | Gap 1A | No | Diagnosis decides whether 1C is needed at all |
| 4 | Gap 1B | No | Ships value whether or not 1C proceeds |
| 5 | Gap 1C | No | Only on evidence from 1A |

Gap 2 comes first because the other two are measured in probabilities, and until the
numerics are pinned those measurements are not reproducible run to run.

## Decisions that need recording

- **ADR-03 amendment** — margin-aware equivalence gate, with the measured ULP
  threshold and its derivation (Gap 2B).
- **New ADR — numerics contract** — FP32 reduction is required on the decision path;
  CUDA, PyTorch and cuBLAS versions are pinned and their bumps are gated (Gap 2A, 2C).
- **New ADR — calibration strategy** — post-hoc calibration with exact binomial
  bounds is the chosen approach, with the stated rationale and the explicit trigger
  condition for revisiting it (Gap 3).
- **New ADR — per-task adaptation policy** — when a LoRA head is permitted, and what
  gate a task must fail before one is trained (Gap 1).
