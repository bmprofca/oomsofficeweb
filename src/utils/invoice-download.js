import axios from 'axios';
import API_BASE_URL from './api-controller';

/**
 * Ask the server to generate an invoice PDF, upload it to OneSaaS storage,
 * and return the public download URL.
 */
export async function requestInvoiceDownloadUrl({ invoiceId, type, headers }) {
    const response = await axios.post(
        `${API_BASE_URL}/invoice/generate`,
        { invoice_id: invoiceId, type, response: 'link' },
        { headers }
    );

    if (!response.data?.success || !response.data?.data?.url) {
        throw new Error(response.data?.message || 'Failed to generate invoice');
    }

    return {
        url: response.data.data.url,
        filename:
            response.data.data.suggested_filename ||
            response.data.data.filename ||
            `invoice-${invoiceId}.pdf`,
    };
}

/** Fetch a remote PDF URL and trigger a browser download. */
export async function downloadFileFromUrl(url, filename) {
    const pdfResponse = await fetch(url);
    if (!pdfResponse.ok) {
        throw new Error('Failed to download PDF from storage');
    }

    const blob = await pdfResponse.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
}

/** Generate via API (uploaded to OneSaaS) then download locally. */
export async function generateAndDownloadInvoice({ invoiceId, type, filename, headers }) {
    const result = await requestInvoiceDownloadUrl({ invoiceId, type, headers });
    const downloadName = filename || result.filename;
    await downloadFileFromUrl(result.url, downloadName);
    return { url: result.url, filename: downloadName };
}
