import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ClinicSettings } from "../../lib/clinicSettings";
import {
  AdditionalServiceRequest,
  PaymentMode,
  QueueItem,
} from "../../types/queue";

type AdditionalServiceReceiptPdfDocumentProps = {
  patient: QueueItem;
  serviceRequest: AdditionalServiceRequest;
  paymentMode: PaymentMode;
  receiptNumber: string;
  paidAt: string;
  clinicSettings: ClinicSettings;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#0f172a",
  },

  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 12,
  },

  clinicName: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
  },

  clinicDetail: {
    marginTop: 3,
    fontSize: 8.5,
    color: "#475569",
  },

  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },

  receiptBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 150,
  },

  smallLabel: {
    fontSize: 7.5,
    color: "#64748b",
  },

  strong: {
    marginTop: 2,
    fontFamily: "Helvetica-Bold",
  },

  section: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    padding: 10,
  },

  sectionTitle: {
    marginBottom: 8,
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
  },

  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
  },

  lastRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },

  label: {
    width: "42%",
    color: "#475569",
  },

  value: {
    width: "58%",
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },

  serviceAmount: {
    width: "25%",
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },

  serviceName: {
    width: "75%",
  },

  note: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },

  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#64748b",
  },
});

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN");
}

function formatAmount(value: number) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdditionalServiceReceiptPdfDocument({
  patient,
  serviceRequest,
  paymentMode,
  receiptNumber,
  paidAt,
  clinicSettings,
}: AdditionalServiceReceiptPdfDocumentProps) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.clinicName}>{clinicSettings.clinicName}</Text>
          <Text style={styles.clinicDetail}>{clinicSettings.address}</Text>
          <Text style={styles.clinicDetail}>{clinicSettings.phone}</Text>
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Additional Service Receipt</Text>
            <Text style={styles.clinicDetail}>
              Receipt for additional test / procedure payment
            </Text>
          </View>

          <View style={styles.receiptBox}>
            <Text style={styles.smallLabel}>Receipt Number</Text>
            <Text style={styles.strong}>{receiptNumber}</Text>

            <Text style={[styles.smallLabel, { marginTop: 5 }]}>
              Date / Time
            </Text>
            <Text style={styles.strong}>{formatDateTime(paidAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Details</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Patient</Text>
            <Text style={styles.value}>{patient.patientName}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>UHID</Text>
            <Text style={styles.value}>{patient.uhid}</Text>
          </View>

          <View style={styles.lastRow}>
            <Text style={styles.label}>Age / Gender</Text>
            <Text style={styles.value}>
              {patient.age} yrs / {patient.gender}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tests / Services</Text>

          {serviceRequest.services.map((service, index) => (
            <View
              key={`${service.serviceName}-${index}`}
              style={
                index === serviceRequest.services.length - 1
                  ? styles.lastRow
                  : styles.row
              }
            >
              <Text style={styles.serviceName}>{service.serviceName}</Text>
              <Text style={styles.serviceAmount}>
                {formatAmount(service.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Gross Amount</Text>
            <Text style={styles.value}>
              {formatAmount(serviceRequest.grossAmount)}
            </Text>
          </View>

          {serviceRequest.discount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Doctor Discount</Text>
              <Text style={styles.value}>
                {formatAmount(serviceRequest.discount)}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid</Text>
            <Text style={styles.value}>
              {formatAmount(serviceRequest.netAmount)}
            </Text>
          </View>

          <View style={styles.lastRow}>
            <Text style={styles.label}>Payment Mode</Text>
            <Text style={styles.value}>{paymentMode}</Text>
          </View>

          {serviceRequest.notes && (
            <View style={styles.note}>
              <Text style={styles.smallLabel}>Doctor Note</Text>
              <Text style={{ marginTop: 3 }}>{serviceRequest.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text>Thank you.</Text>
          <Text>Generated by Eye Clinic App</Text>
        </View>
      </Page>
    </Document>
  );
}
