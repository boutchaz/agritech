interface PageViewEvent {
  path: string;
  title: string;
}

export function trackPageView(_event: PageViewEvent): void {}
export function trackFeatureUsed(_feature: string, _trigger: string): void {}
export function trackFormSubmitStart(_formName: string): void {}
export function trackFormSubmitSuccess(_formName: string): void {}
export function trackFormSubmitError(_formName: string, _error: string): void {}
