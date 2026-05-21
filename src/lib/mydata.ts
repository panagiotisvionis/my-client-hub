// myDATA (ΑΑΔΕ) Integration
// Εγγραφή: https://www.aade.gr/mydata
// API Docs: https://www.aade.gr/sites/default/files/2023-08/myDATA_API_Documentation_v1.0.8.2_erp.pdf

import { TherapistProfile, Invoice, Client, Session, SESSION_TYPE_LABELS } from '@/types';

const DEV_ENDPOINT = 'https://mydataapidev.aade.gr/SendInvoices';
const PROD_ENDPOINT = 'https://mydatapi.aade.gr/myDATA/SendInvoices';

export interface MyDataResult {
  success: boolean;
  mark?: string;
  uid?: string;
  error?: string;
}

// Generates the XML payload required by myDATA API
function buildInvoiceXML(
  invoice: Invoice,
  client: Client,
  sessions: Session[],
  profile: TherapistProfile
): string {
  const invoiceSessions = sessions.filter(s => invoice.sessionIds.includes(s.id));
  const issueDate = invoice.date;

  const lines = invoiceSessions.map((s, i) => `
    <invoiceDetails>
      <lineNumber>${i + 1}</lineNumber>
      <netValue>${s.fee.toFixed(2)}</netValue>
      <vatCategory>7</vatCategory>
      <vatAmount>0.00</vatAmount>
      <discountOption>false</discountOption>
      <incomeClassification>
        <icls:classificationType>E3_561_001</icls:classificationType>
        <icls:classificationCategory>category1_1</icls:classificationCategory>
        <icls:amount>${s.fee.toFixed(2)}</icls:amount>
      </incomeClassification>
    </invoiceDetails>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<InvoicesDoc xmlns="https://www.aade.gr/myDATA/invoice/v1.0.8"
  xmlns:icls="https://www.aade.gr/myDATA/incomeClassificaton/v1.0.8"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <invoice>
    <issuer>
      <vatNumber>${profile.afm}</vatNumber>
      <country>GR</country>
      <branch>0</branch>
    </issuer>
    <counterpart>
      <vatNumber>000000000</vatNumber>
      <country>GR</country>
      <branch>0</branch>
      <name>${client.lastName} ${client.firstName}</name>
    </counterpart>
    <invoiceHeader>
      <series>A</series>
      <aa>${invoice.invoiceNumber}</aa>
      <issueDate>${issueDate}</issueDate>
      <invoiceType>2.1</invoiceType>
      <currency>EUR</currency>
    </invoiceHeader>
    <paymentMethods>
      <paymentMethodDetails>
        <type>3</type>
        <amount>${invoice.total.toFixed(2)}</amount>
      </paymentMethodDetails>
    </paymentMethods>
    ${lines}
    <invoiceSummary>
      <totalNetValue>${invoice.total.toFixed(2)}</totalNetValue>
      <totalVatAmount>0.00</totalVatAmount>
      <totalWithheldAmount>0.00</totalWithheldAmount>
      <totalFeesAmount>0.00</totalFeesAmount>
      <totalStampDutyAmount>0.00</totalStampDutyAmount>
      <totalOtherTaxesAmount>0.00</totalOtherTaxesAmount>
      <totalDeductionsAmount>0.00</totalDeductionsAmount>
      <totalGrossValue>${invoice.total.toFixed(2)}</totalGrossValue>
      <incomeClassification>
        <icls:classificationType>E3_561_001</icls:classificationType>
        <icls:classificationCategory>category1_1</icls:classificationCategory>
        <icls:amount>${invoice.total.toFixed(2)}</icls:amount>
      </incomeClassification>
    </invoiceSummary>
  </invoice>
</InvoicesDoc>`;
}

export async function submitToMyData(
  invoice: Invoice,
  client: Client,
  sessions: Session[],
  profile: TherapistProfile
): Promise<MyDataResult> {
  if (!profile.myDataUserId || !profile.myDataSubscriptionKey || !profile.afm) {
    return { success: false, error: 'Δεν έχουν οριστεί τα στοιχεία myDATA στις Ρυθμίσεις.' };
  }

  const endpoint = profile.myDataProduction ? PROD_ENDPOINT : DEV_ENDPOINT;
  const xml = buildInvoiceXML(invoice, client, sessions, profile);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'aade-user-id': profile.myDataUserId,
        'Ocp-Apim-Subscription-Key': profile.myDataSubscriptionKey,
      },
      body: xml,
    });

    const text = await response.text();

    // Parse MARK from response XML
    const markMatch = text.match(/<mark>(\d+)<\/mark>/);
    const uidMatch = text.match(/<uid>([^<]+)<\/uid>/);
    const errorMatch = text.match(/<message>([^<]+)<\/message>/);

    if (markMatch) {
      return { success: true, mark: markMatch[1], uid: uidMatch?.[1] };
    }

    return {
      success: false,
      error: errorMatch?.[1] ?? `HTTP ${response.status}: Αποτυχία αποστολής στο myDATA`,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function cancelFromMyData(
  mark: string,
  profile: TherapistProfile
): Promise<MyDataResult> {
  if (!profile.myDataUserId || !profile.myDataSubscriptionKey) {
    return { success: false, error: 'Δεν έχουν οριστεί τα στοιχεία myDATA.' };
  }

  const baseUrl = profile.myDataProduction
    ? 'https://mydatapi.aade.gr/myDATA'
    : 'https://mydataapidev.aade.gr';

  try {
    const response = await fetch(`${baseUrl}/CancelInvoice?mark=${mark}`, {
      method: 'POST',
      headers: {
        'aade-user-id': profile.myDataUserId,
        'Ocp-Apim-Subscription-Key': profile.myDataSubscriptionKey,
      },
    });

    const text = await response.text();
    const cancelMark = text.match(/<cancellationMark>(\d+)<\/cancellationMark>/)?.[1];

    if (cancelMark) {
      return { success: true, mark: cancelMark };
    }

    const errorMatch = text.match(/<message>([^<]+)<\/message>/);
    return { success: false, error: errorMatch?.[1] ?? 'Αποτυχία ακύρωσης' };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
