import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ClinicSettings } from "../../lib/clinicSettings";
import { QueueItem } from "../../types/queue";

type PrescriptionPdfDocumentProps = {
  patient: QueueItem;
  clinicSettings: ClinicSettings;
  dateText: string;
  logoSrc?: string;
};

const visionRows = [
  { key: "unaided", label: "Unaided" },
  { key: "withGlasses", label: "Glasses" },
  { key: "withPinHole", label: "Pin Hole" },
] as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#0f172a",
    lineHeight: 1.35,
  },

  header: {
    position: "relative",
    height: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 8,
  },

  logoColumn: {
    position: "absolute",
    left: 0,
    top: 2,
    width: 128,
    height: 46,
  },

  logo: {
    width: 128,
    height: 46,
    objectFit: "contain",
  },

  logoPlaceholder: {
    width: 128,
    height: 46,
  },

  doctorBlock: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 350,
  },

  doctorName: {
    width: "100%",
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },

  doctorQualification: {
    width: "100%",
    marginTop: 2,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    textAlign: "right",
  },

  doctorDetail: {
    width: "100%",
    marginTop: 3,
    fontSize: 8.5,
    color: "#475569",
    textAlign: "right",
  },

  patientSummary: {
    marginTop: 8,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },

  patientCell: {
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },

  patientCellLast: {
    paddingVertical: 6,
    paddingHorizontal: 7,
  },

  patientLabel: {
    fontSize: 6.5,
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },

  patientValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },

  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  section: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
  },

  rowSection: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
  },

  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  bodyText: {
    fontSize: 9,
    color: "#1e293b",
  },

  table: {
    marginTop: 4,
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
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 7.5,
  },

  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    color: "#334155",
  },

  signatureRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  signatureBlock: {
    width: 145,
    textAlign: "right",
  },

  signatureLine: {
    height: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    marginBottom: 4,
  },

  signatureTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },

  signatureDetail: {
    marginTop: 2,
    fontSize: 7.5,
    color: "#64748b",
  },
});

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

export default function PrescriptionPdfDocument({
  patient,
  clinicSettings,
  dateText,
  logoSrc,
}: PrescriptionPdfDocumentProps) {
  const optometristWorkup = patient.optometristWorkup;
  const consultation = patient.doctorConsultation;

  const hasChiefComplaint = hasText(optometristWorkup?.chiefComplaint);
  const hasHistory = hasText(optometristWorkup?.optometristNotes);
  const hasFindings = hasText(consultation?.findings);
  const hasDiagnosis = hasText(consultation?.diagnosis);
  const hasAdvice = hasText(consultation?.advice);

  const hasFollowUp = Boolean(
    consultation?.freeFollowUpValidUntil || consultation?.followUpDate
  );

  const hasMedicines =
    Boolean(consultation?.medicines) &&
    consultation!.medicines.length > 0;

  return (
    <Document
      title={`Prescription - ${patient.patientName}`}
      author={clinicSettings.doctorName}
      subject={`Prescription for ${patient.patientName}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoColumn}>
            {logoSrc ? (
              <Image src={logoSrc} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder} />
            )}
          </View>

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

        <View style={styles.patientSummary}>
          <View style={[styles.patientCell, { width: "30%" }]}>
            <Text style={styles.patientLabel}>Patient</Text>
            <Text style={styles.patientValue}>{patient.patientName}</Text>
          </View>

          <View style={[styles.patientCell, { width: "17%" }]}>
            <Text style={styles.patientLabel}>UHID</Text>
            <Text style={styles.patientValue}>{patient.uhid}</Text>
          </View>

          <View style={[styles.patientCell, { width: "17%" }]}>
            <Text style={styles.patientLabel}>Age / Gender</Text>
            <Text style={styles.patientValue}>
              {patient.age} yrs / {patient.gender}
            </Text>
          </View>

          <View style={[styles.patientCell, { width: "21%" }]}>
            <Text style={styles.patientLabel}>Visit</Text>
            <Text style={styles.patientValue}>{patient.visitType}</Text>
          </View>

          <View style={[styles.patientCellLast, { width: "15%" }]}>
            <Text style={styles.patientLabel}>Date</Text>
            <Text style={styles.patientValue}>{dateText}</Text>
          </View>
        </View>

        {(hasChiefComplaint || optometristWorkup?.vision) && (
          <View style={styles.row}>
            {hasChiefComplaint && (
              <View style={[styles.rowSection, { width: "39%" }]}>
                <Text style={styles.sectionTitle}>Chief Complaint</Text>
                <Text style={styles.bodyText}>
                  {optometristWorkup?.chiefComplaint}
                </Text>
              </View>
            )}

            {optometristWorkup?.vision && (
              <View
                style={[
                  styles.rowSection,
                  { width: hasChiefComplaint ? "61%" : "100%" },
                ]}
              >
                <Text style={styles.sectionTitle}>Vision / VA</Text>

                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { width: "20%" },
                      ]}
                    >
                      Type
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { width: "20%", textAlign: "center" },
                      ]}
                    >
                      D OD
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { width: "20%", textAlign: "center" },
                      ]}
                    >
                      D OS
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { width: "20%", textAlign: "center" },
                      ]}
                    >
                      N OD
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { width: "20%", textAlign: "center" },
                      ]}
                    >
                      N OS
                    </Text>
                  </View>

                  {visionRows.map((row) => {
                    const visionEntry = optometristWorkup.vision[row.key];

                    return (
                      <View style={styles.tableRow} key={row.key}>
                        <Text style={[styles.tableCell, { width: "20%" }]}>
                          {row.label}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            { width: "20%", textAlign: "center" },
                          ]}
                        >
                          {visionEntry.distanceOD || "—"}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            { width: "20%", textAlign: "center" },
                          ]}
                        >
                          {visionEntry.distanceOS || "—"}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            { width: "20%", textAlign: "center" },
                          ]}
                        >
                          {visionEntry.nearOD || "—"}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            { width: "20%", textAlign: "center" },
                          ]}
                        >
                          {visionEntry.nearOS || "—"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {hasHistory && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              History / Relevant Background
            </Text>
            <Text style={styles.bodyText}>
              {optometristWorkup?.optometristNotes}
            </Text>
          </View>
        )}

        {hasFindings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Findings</Text>
            <Text style={styles.bodyText}>{consultation?.findings}</Text>
          </View>
        )}

        {hasDiagnosis && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Diagnosis / Impression</Text>
            <Text style={styles.bodyText}>{consultation?.diagnosis}</Text>
          </View>
        )}

        {hasMedicines && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medicines</Text>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { width: "28%" },
                  ]}
                >
                  Medicine
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { width: "14%" },
                  ]}
                >
                  Eye / Route
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { width: "17%" },
                  ]}
                >
                  Frequency
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { width: "13%" },
                  ]}
                >
                  Duration
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { width: "28%" },
                  ]}
                >
                  Instructions
                </Text>
              </View>

              {consultation?.medicines.map((medicine) => (
                <View style={styles.tableRow} key={medicine.id}>
                  <Text style={[styles.tableCell, { width: "28%" }]}>
                    {medicine.medicineName || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "14%" }]}>
                    {medicine.eye || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "17%" }]}>
                    {medicine.frequency || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "13%" }]}>
                    {medicine.duration || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "28%" }]}>
                    {medicine.instructions || "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(hasAdvice || hasFollowUp) && (
          <View style={styles.row}>
            {hasAdvice && (
              <View
                style={[
                  styles.rowSection,
                  { width: hasFollowUp ? "66%" : "100%" },
                ]}
              >
                <Text style={styles.sectionTitle}>Advice</Text>
                <Text style={styles.bodyText}>{consultation?.advice}</Text>
              </View>
            )}

            {hasFollowUp && (
              <View
                style={[
                  styles.rowSection,
                  { width: hasAdvice ? "34%" : "100%" },
                ]}
                wrap={false}
              >
                <Text style={styles.sectionTitle}>
                  {consultation?.freeFollowUpValidUntil
                    ? "Free Follow-Up Valid Until"
                    : "Follow-Up"}
                </Text>

                <Text
                  style={[
                    styles.bodyText,
                    { fontFamily: "Helvetica-Bold" },
                  ]}
                >
                  {consultation?.freeFollowUpValidUntil ||
                    consultation?.followUpDate}
                </Text>
              </View>
            )}
          </View>
        )}

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
