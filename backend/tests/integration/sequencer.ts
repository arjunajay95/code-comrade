import { BaseSequencer, type TestSpecification } from "vitest/node";

// The post-suite audit looks at the database that every other integration file
// leaves behind, so it must run after all of them. Vitest orders files by how
// long they took last time, which says nothing about this, so this sequencer
// keeps its normal order and moves the audit file to the end.
const AUDIT_FILE = "postSuiteAudit.test.ts";

export default class AuditLastSequencer extends BaseSequencer {
  override async sort(
    files: TestSpecification[],
  ): Promise<TestSpecification[]> {
    const sorted = await super.sort(files);
    const isAudit = (file: TestSpecification) =>
      file.moduleId.endsWith(AUDIT_FILE);
    return [
      ...sorted.filter((file) => !isAudit(file)),
      ...sorted.filter(isAudit),
    ];
  }
}
