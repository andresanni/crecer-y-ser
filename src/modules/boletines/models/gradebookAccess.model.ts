import type { GradebookDataSource } from './gradebookDataSource.model';

export interface GradebookAccessPolicy {
  mode: 'staff' | 'magic-link';
  canEditStudentSupport: boolean;
  canEditPeriodClosure: boolean;
  dataSource?: GradebookDataSource;
  onAccessDenied?: () => void;
}

export const staffGradebookAccess: GradebookAccessPolicy = {
  mode: 'staff',
  canEditStudentSupport: true,
  canEditPeriodClosure: true,
};

export const createMagicLinkGradebookAccess = (
  subjectScoped: boolean,
  dataSource: GradebookDataSource,
  onAccessDenied: () => void,
): GradebookAccessPolicy => ({
  mode: 'magic-link',
  canEditStudentSupport: !subjectScoped,
  canEditPeriodClosure: !subjectScoped,
  dataSource,
  onAccessDenied,
});
