export type ScanState =
  | 'plant_required'
  | 'aligning'
  | 'out_of_frame'
  | 'optimal'
  | 'too_dark'
  | 'no_leaf_detected'
  | 'processing'
  | 'scan_success'
  | 'scan_failed';
