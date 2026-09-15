import type { GradebookDataSource, GradebookSubmissionResult } from './gradebookDataSource.model';

export interface GradebookAccessPolicy {
  mode: 'staff' | 'magic-link';
  canEditStudentSupport: boolean;
  canEditPeriodClosure: boolean;
  canSubmitPeriod: boolean;
  dataSource?: GradebookDataSource;
  onAccessDenied?: () => void;
  onPeriodSubmitted?: (result: GradebookSubmissionResult) => void;
}

export const staffGradebookAccess: GradebookAccessPolicy = {
  mode: 'staff',
  canEditStudentSupport: true,
  canEditPeriodClosure: true,
  canSubmitPeriod: false,
};

export const createMagicLinkGradebookAccess = (
  dataSource: GradebookDataSource,
  onAccessDenied: () => void,
  onPeriodSubmitted: (result: GradebookSubmissionResult) => void,
): GradebookAccessPolicy => ({
  mode: 'magic-link',
  canEditStudentSupport: true,
  canEditPeriodClosure: true,
  canSubmitPeriod: true,
  dataSource,
  onAccessDenied,
  onPeriodSubmitted,
});
