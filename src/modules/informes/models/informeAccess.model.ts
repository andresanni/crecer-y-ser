import type { InformeDataSource, InformeSubmissionResult } from './informeDataSource.model';

export interface InformeAccessPolicy {
  mode: 'staff' | 'magic-link';
  canSubmitReport: boolean;
  dataSource: InformeDataSource;
  onAccessDenied?: () => void;
  onReportSubmitted?: (result: InformeSubmissionResult) => void;
}

export const createStaffInformeAccess = (dataSource: InformeDataSource): InformeAccessPolicy => ({
  mode: 'staff',
  canSubmitReport: false,
  dataSource,
});

export const createMagicLinkInformeAccess = (
  dataSource: InformeDataSource,
  onAccessDenied: () => void,
  onReportSubmitted: (result: InformeSubmissionResult) => void,
): InformeAccessPolicy => ({
  mode: 'magic-link',
  canSubmitReport: true,
  dataSource,
  onAccessDenied,
  onReportSubmitted,
});
