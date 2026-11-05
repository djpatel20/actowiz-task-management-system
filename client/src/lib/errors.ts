/**
 * Error extraction utility for consistent, human-readable UI error messages.
 * Robustly inspects Axios error responses, backend validation details, and general errors.
 */

export interface ApiValidationErrorDetail {
  field?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: ApiValidationErrorDetail[];
  };
  message?: string;
}

export function getApiErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback;

  if (typeof err === 'string') return err;

  const axiosErr = err as {
    response?: {
      data?: ApiErrorResponse;
      statusText?: string;
    };
    message?: string;
  };

  const responseData = axiosErr.response?.data;
  const errorObj = responseData?.error;

  if (errorObj) {
    // If validation details exist, extract all field messages
    if (Array.isArray(errorObj.details) && errorObj.details.length > 0) {
      const detailMessages = errorObj.details
        .map((d) => (typeof d === 'object' && d?.message ? d.message : ''))
        .filter(Boolean);

      if (detailMessages.length > 0) {
        // If the top-level message is missing or generic (e.g. "Validation failed"), use the details
        const isGenericMessage =
          !errorObj.message ||
          errorObj.message.trim().toLowerCase() === 'validation failed' ||
          errorObj.message.trim().toLowerCase() === 'validation error' ||
          errorObj.message.trim().toLowerCase() === 'bad request';

        if (isGenericMessage) {
          return detailMessages.join('. ');
        }
      }
    }

    if (errorObj.message && errorObj.message.trim().length > 0) {
      return errorObj.message;
    }
  }

  if (responseData?.message && responseData.message.trim().length > 0) {
    return responseData.message;
  }

  if (axiosErr.response?.statusText) {
    return axiosErr.response.statusText;
  }

  if (axiosErr.message && axiosErr.message.trim().length > 0) {
    return axiosErr.message;
  }

  return fallback;
}
