export function extractIdFromTags(build: any, key: string): number | undefined {
  const checkIdTag: string | undefined = build.tags && build.tags.find((tag: string) => tag.includes(`${key}_`));
  if (typeof checkIdTag === 'undefined') return;
  return parseInt(checkIdTag.replace(`${key}_`, ''));
}

export function getFailureSummary(build: any): string {
  const failedStep = build.steps.find((step: any) => step.status === 'FAILURE');
  const failedStepMessage = failedStep ? `The clould build failed at step '${failedStep.id}'.` : '';
  return `${failedStepMessage}\n\nDetails: ${build.logUrl}`;
}
