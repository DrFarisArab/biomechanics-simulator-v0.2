/**
 * Lumbopelvic rhythm — during forward trunk flexion, the pelvis follows
 * the lumbar spine's lead past a "setting phase" (same coordinated
 * pattern the v1 app used for the same coupling, one level down the
 * chain from scapulohumeral rhythm).
 *
 * LP_SET_POINT: degrees of lumbar flexion before the pelvis starts
 * tilting at all (lumbar-dominant phase — early trunk bend is nearly all
 * spine, the pelvis barely moves, matching real early-phase
 * lumbopelvic mechanics).
 * LP_FRACTION: tuned so the pelvis reaches close to its own comfortable
 * anterior-tilt range as lumbar approaches its own flexion ceiling —
 * same tuning logic the v1 app used (not a primary-source biomechanics
 * constant, a demo-grade approximation, disclosed as such there too).
 *
 * This is ADDITIVE, not a replacement: the user's own pelvis.tilt input
 * stays fully live and controllable — the derived contribution is summed
 * on top, then the shared rest+delta composition & ROM clamp (via the
 * DOF's own min/max in trunkDofs.ts) caps the total, same pattern as
 * every other derived coupling in this app.
 */
const LP_SET_POINT = 20;
const LP_FRACTION = 0.5;

export function lumbopelvicTiltDeg(lumbarFlexExtDeg: number): number {
  const past = Math.max(0, lumbarFlexExtDeg - LP_SET_POINT);
  return past * LP_FRACTION;
}

/**
 * Reverse coupling: when the user dials PELVIS tilt directly (not via
 * lumbar flexion), the pelvis's rotation would otherwise propagate rigidly
 * up through the lumbar→thoracic→cervical→head chain (they're all real
 * parent/child bones), tipping the ENTIRE trunk over as one straight rod —
 * anatomically wrong. In real posture, anterior pelvic tilt is compensated
 * by increased lumbar lordosis (lumbar EXTENSION) so the thorax stays
 * upright; posterior pelvic tilt is compensated the opposite way. This is
 * a full, immediate 1:1 cancellation (not the graded "set point" curve
 * `lumbopelvicTiltDeg` above uses for the other direction) — the whole
 * point is that dialing pelvis tilt should visibly rotate the PELVIS while
 * everything above the lumbar chain stays put, not lean progressively more
 * as the angle increases. Pelvis tilt's own ROM ceiling (+20°/-15°) sits
 * safely inside lumbar's extension ROM (-25°), so full cancellation never
 * clips against the lumbar chain's own limits.
 */
export function pelvisTiltLumbarCompensationDeg(pelvisTiltDeg: number): number {
  return -pelvisTiltDeg;
}
