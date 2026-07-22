export const OPEN_CREATE_EVENT = "foxfam:open-create";
export const SUBMISSION_RECEIPT_EVENT = "foxfam:submission-receipt";
export const DRAFTS_CHANGED_EVENT = "foxfam:drafts-changed";

export function openCreateFlow(action = "") {
  window.dispatchEvent(new CustomEvent(OPEN_CREATE_EVENT, { detail: { action } }));
}

export function publishSubmissionReceipt(receipt) {
  window.dispatchEvent(new CustomEvent(SUBMISSION_RECEIPT_EVENT, { detail: receipt }));
}

export function announceDraftsChanged() {
  window.dispatchEvent(new CustomEvent(DRAFTS_CHANGED_EVENT));
}
