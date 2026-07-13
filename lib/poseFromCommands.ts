import { parsePoseCommand, isParseError } from "./commandParser";

/**
 * Turns a short list of natural-language pose commands (the same grammar the
 * CommandBox UI accepts) into a single angles object — an authoring shortcut
 * for building special-test poses without hand-writing raw joint/DOF/sign
 * objects. Reuses the parser's existing joint/DOF validation, ROM clamping,
 * and per-joint sign resolution, so a typo'd joint name or an out-of-range
 * angle is caught the same way it would be for a user typing into the box.
 *
 * Throws at call time (not silently swallowed) if any command fails to
 * parse — this is meant to be called at module-eval time while authoring
 * new special-test poses, so a bad command should fail loudly during
 * development, not produce a silently-incomplete pose that ships.
 */
export function buildAnglesFromCommands(commands: string[]): Record<string, Record<string, number>> {
  const angles: Record<string, Record<string, number>> = {};
  for (const cmd of commands) {
    const result = parsePoseCommand(cmd);
    if (isParseError(result)) {
      throw new Error(`Special-test pose command failed to parse: "${cmd}" — ${result.error}`);
    }
    for (const jointId of result.jointIds) {
      angles[jointId] = { ...angles[jointId], [result.dofId]: result.value };
    }
  }
  return angles;
}
