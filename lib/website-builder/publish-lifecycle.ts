export const WEBSITE_PUBLISH_STATES = [
  "publish_requested",
  "validating_origin",
  "validating_domain",
  "validating_ssl",
  "smoke_testing",
  "live",
  "failed",
] as const;

export type WebsitePublishState = (typeof WEBSITE_PUBLISH_STATES)[number];

export const WEBSITE_PUBLISH_SUCCESS_PATH: WebsitePublishState[] = [
  "publish_requested",
  "validating_origin",
  "validating_domain",
  "validating_ssl",
  "smoke_testing",
  "live",
];

export function publishStateComesAfter(
  state: WebsitePublishState,
  prerequisite: WebsitePublishState
): boolean {
  return WEBSITE_PUBLISH_SUCCESS_PATH.indexOf(state) > WEBSITE_PUBLISH_SUCCESS_PATH.indexOf(prerequisite);
}
