import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ClinicSettings } from "../../lib/clinicSettings";
import { QueueItem } from "../../types/queue";

type SpectaclePdfDocumentProps = {
  patient: QueueItem;
  clinicSettings: ClinicSettings;
  dateText: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
    lineHeight: 1.35,
  },

  header: {
    position: "relative",
    height: 74,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 12,
  },

  clinicName: {
    position: "absolute",
    left: 0,
    top: 10,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },

  doctorBlock: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 360,
  },

  doctorName: {
    width: "100%",
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },

  doctorQualification: {
    width: "100%",
    marginTop: 3,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    textAlign: "right",
  },

  doctorDetail: {
    width: "100%",
    marginTop: 4,
    fontSize: 8.5,
    color: "#475569",
    textAlign: "right",
  },

  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },

  dateBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 8,
    textAlign: "right",
  },

  dateLabel: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
  },

  dateValue: {
    marginTop: 2,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },

  patientSummary: {
    marginTop: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },

  patientCell: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },

  patientCellLast: {
    paddingVertical: 7,
    paddingHorizontal: 8,
  },

  label: {
    fontSize: 7,
    color: "#64748b",
    marginBottom: 2,
  },

  value: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },

  section: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
  },

  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },

  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#e2e8f0",
  },

  tableRow: {
    flexDirection: "row",
  },

  tableHeader: {
    backgroundColor: "#f8fafc",
  },

  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 9,
  },

  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    color: "#334155",
  },

  remarksBox: {
    marginTop: 10,
    backgroundColor: "#f8fafc",
    padding: 8,
  },

  remarksLabel: {
    fontSize: 7,
    color: "#64748b",
    marginBottom: 3,
  },

  remarksText: {
    fontSize: 9,
    color: "#1e293b",
  },

  signatureRow: {
    marginTop: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  signatureBlock: {
    width: 155,
    textAlign: "right",
  },

  signatureLine: {
    height: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    marginBottom: 5,
  },

  signatureTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },

  signatureDetail: {
    marginTop: 2,
    fontSize: 8,
    color: "#64748b",
  },
});

export default function SpectaclePdfDocument({
  patient,
  clinicSettings,
  dateText,
}: SpectaclePdfDocumentProps) {
  const advice = patient.doctorConsultation?.finalSpectacleAdvice;

  const rows = [
    { label: "OD", value: advice?.od },
    { label: "OS", value: advice?.os },
    { label: "Add", value: advice?.add },
  ];

  return (
    <Document
      title={`Spectacle Prescription - ${patient.patientName}`}
      author={clinicSettings.doctorName}
      subject={`Spectacle Prescription for ${patient.patientName}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.clinicName}>{clinicSettings.clinicName}</Text>

          <View style={styles.doctorBlock}>
            <Text style={styles.doctorName}>
              {clinicSettings.doctorName}
            </Text>

            <Text style={styles.doctorQualification}>
              {clinicSettings.doctorQualification} · Regn:{" "}
              {clinicSettings.medicalRegistrationNumber}
            </Text>

            <Text style={styles.doctorDetail}>
              {clinicSettings.address}
            </Text>

            <Text style={styles.doctorDetail}>
              {clinicSettings.phone} · {clinicSettings.email}
            </Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Final Spectacle Prescription</Text>

          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Spectacle Advice</Text>
            <Text style={styles.dateValue}>{dateText}</Text>
          </View>
        </View>

        <View style={styles.patientSummary}>
          <View style={[styles.patientCell, { width: "50%" }]}>
            <Text style={styles.label}>Patient</Text>
            <Text style={styles.value}>{patient.patientName}</Text>
          </View>

          <View style={[styles.patientCell, { width: "25%" }]}>
            <Text style={styles.label}>UHID</Text>
            <Text style={styles.value}>{patient.uhid}</Text>
          </View>

          <View style={[styles.patientCellLast, { width: "25%" }]}>
            <Text style={styles.label}>Age / Gender</Text>
            <Text style={styles.value}>
              {patient.age} yrs / {patient.gender}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spectacle Power</Text>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderText,
                  { width: "20%" },
                ]}
              >
                Eye
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderText,
                  { width: "20%", textAlign: "center" },
                ]}
              >
                Sph.
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderText,
                  { width: "20%", textAlign: "center" },
                ]}
              >
                Cyl.
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderText,
                  { width: "20%", textAlign: "center" },
                ]}
              >
                Axis
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderText,
                  { width: "20%", textAlign: "center" },
                ]}
              >
                Vision
              </Text>
            </View>

            {rows.map((row) => (
              <View style={styles.tableRow} key={row.label}>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "20%", fontFamily: "Helvetica-Bold" },
                  ]}
                >
                  {row.label}
                </Text>

                <Text
                  style={[
                    styles.tableCell,
                    { width: "20%", textAlign: "center" },
                  ]}
                >
                  {row.value?.sph || "—"}
                </Text>

                <Text
                  style={[
                    styles.tableCell,
                    { width: "20%", textAlign: "center" },
                  ]}
                >
                  {row.value?.cyl || "—"}
                </Text>

                <Text
                  style={[
                    styles.tableCell,
                    { width: "20%", textAlign: "center" },
                  ]}
                >
                  {row.value?.axis || "—"}
                </Text>

                <Text
                  style={[
                    styles.tableCell,
                    { width: "20%", textAlign: "center" },
                  ]}
                >
                  {row.value?.vision || "—"}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.remarksBox}>
            <Text style={styles.remarksLabel}>Remarks</Text>
            <Text style={styles.remarksText}>
              {advice?.remarks || "Not entered"}
            </Text>
          </View>
        </View>

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureTitle}>Doctor Signature</Text>
            <Text style={styles.signatureDetail}>
              {clinicSettings.doctorName}
            </Text>
            <Text style={styles.signatureDetail}>
              Regn: {clinicSettings.medicalRegistrationNumber}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
