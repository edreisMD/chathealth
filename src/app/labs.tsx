import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { Swipeable } from "react-native-gesture-handler";
import { authorizedFetch } from "@/lib/api";
import { routes } from "@/lib/routes";
import NavigationSelector from "@/components/health-tabs-selector";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "@/components/header";
import SlidingSidebar from "@/components/sliding-sidebar";

const LAB_RESULTS_CACHE_KEY = "lab_results_cache";
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

interface LabResult {
  labResultId: string;
  imageUrl: string;
  labType?: string;
  labDate?: string;
  labProvider?: string;
  results: {
    labType?: string;
    labProvider?: string;
    labDate?: string;
    results: {
      testName: string;
      value: string;
      unit?: string;
      referenceRange?: string;
      flag?: string;
      status?: "normal" | "high" | "low" | "critical" | "abnormal";
    }[];
    confidence: "high" | "medium" | "low";
  };
  confidence?: string;
  createdAt: string;
}

interface LabTest {
  name: string;
  frequency?: "2x";
  type?: "Add on" | "New" | "Coming soon";
  description?: string;
}

interface LabSection {
  title: string;
  tests: LabTest[];
}

const labSections: LabSection[] = [
  {
    title: "Heart",
    tests: [
      { name: "Apolipoprotein B (ApoB)" },
      { name: "Total Cholesterol / HDL Ratio", frequency: "2x" },
      { name: "HDL Cholesterol", frequency: "2x" },
      { name: "HDL Large" },
      { name: "High-Sensitivity C-Reactive Protein (hs-CRP)", frequency: "2x" },
      { name: "LDL Cholesterol", frequency: "2x" },
      { name: "LDL Medium" },
      { name: "LDL Particle Number" },
      { name: "LDL Pattern" },
      { name: "LDL Peak Size" },
      { name: "LDL Small" },
      { name: "Lipoprotein (a)" },
      { name: "Non-HDL Cholesterol", frequency: "2x" },
      { name: "Total Cholesterol", frequency: "2x" },
      { name: "Triglycerides", frequency: "2x" },
      { name: "Apolipoprotein A1", type: "Add on" },
      { name: "Apolipoprotein C1", type: "Add on" },
      { name: "Apolipoprotein C2", type: "Add on" },
      { name: "Apolipoprotein C3", type: "Add on" },
      { name: "Apolipoprotein C4", type: "Add on" },
      { name: "Cystatin C", type: "Add on" },
      { name: "Fibrinogen Antigen, Nephelometry", type: "Add on" },
      { name: "HDLfx pCAD Score", type: "Add on" },
      { name: "HDLfx pCEC", type: "Add on" },
      { name: "Lp-PLA2 Activity", type: "Add on" },
      { name: "Myeloperoxidase", type: "Add on" },
      { name: "Oxidized LDL", type: "Add on" },
      { name: "Trimethylamine N-Oxide", type: "Add on" },
      { name: "4q25-Atrial Fibrillation Risk", type: "Add on" },
      { name: "9p21 Genotype", type: "Add on" },
      { name: "LPA Aspirin Genotype", type: "Add on" },
      { name: "MTHFR, DNA", type: "Add on" },
      { name: "Apolipoprotein B/Apolipoprotein A1 Ratio", type: "Add on" },
    ],
  },
  {
    title: "Thyroid",
    tests: [
      { name: "Thyroglobulin Antibodies" },
      { name: "Thyroid Peroxidase Antibodies" },
      { name: "Thyroid-Stimulating Hormone" },
      { name: "Thyroxine (T4) Free" },
      { name: "Triiodothyronine (T3) Free" },
      { name: "Iodine", type: "Add on" },
      { name: "Thyroid Stimulating Immunoglobulin", type: "Add on" },
      {
        name: "Thyroid-Stimulating Hormone Receptor Binding Antibody",
        type: "Add on",
      },
      { name: "Thyroxine-Binding Globulin", type: "Add on" },
      { name: "Selenium", type: "Add on" },
    ],
  },
  {
    title: "Cancer Detection",
    tests: [
      { name: "Multi-Cancer Detection Test", type: "Add on" },
      { name: "Prostate Specific Antigen (PSA), Free" },
      { name: "Prostate Specific Antigen (PSA) %, Free" },
      { name: "Prostate Specific Antigen (PSA), Total" },
    ],
  },
  {
    title: "Autoimmunity",
    tests: [
      { name: "Antinuclear Antibodies Pattern" },
      { name: "Antinuclear Antibodies Screen" },
      { name: "Antinuclear Antibodies Titer" },
      { name: "Rheumatoid Factor" },
      {
        name: "Beta-2-Glycoprotein Antibodies (IgG, IgA, IgM)",
        type: "Add on",
      },
      { name: "Cardiolipin Antibodies (IgA, IgG, IgM)", type: "Add on" },
      { name: "Centromere B Antibody", type: "Add on" },
      { name: "Chromatin (Nucleosomal) Antibody", type: "Add on" },
      { name: "Complement Components C3c and C4c", type: "Add on" },
      { name: "Cyclic Citrullinated Peptide Antibody (IgG)", type: "Add on" },
      { name: "DNA Antibody (ds) Crithidia, IFA", type: "Add on" },
      { name: "Erythrocyte Sedimentation Rate", type: "Add on" },
      { name: "Jo-1 Antibody", type: "Add on" },
      { name: "Mutated Citrullinated Vimentin Antibody", type: "Add on" },
      { name: "Rheumatoid Factor (IgA, IgG, IgM)", type: "Add on" },
      { name: "RNP Antibody", type: "Add on" },
      { name: "Scleroderma Antibody (Scl-70)", type: "Add on" },
      { name: "Sjögren's Antibodies (SS-A, SS-B)", type: "Add on" },
      { name: "SM Antibody", type: "Add on" },
      { name: "Celiac- Deamidated Gliadin (IgA, IgG)", type: "Add on" },
      { name: "Celiac- Tissue Transglutaminase (IgA, IgG)", type: "Add on" },
      { name: "SM/RNP Antibody", type: "Add on" },
    ],
  },
  {
    title: "Immune Regulation",
    tests: [
      { name: "Basophils", frequency: "2x" },
      { name: "Eosinophils", frequency: "2x" },
      { name: "Lymphocytes", frequency: "2x" },
      { name: "Monocytes", frequency: "2x" },
      { name: "Neutrophils", frequency: "2x" },
      { name: "White Blood Cell Count", frequency: "2x" },
      { name: "High-Sensitivity C-Reactive Protein (hs-CRP)", frequency: "2x" },
      { name: "Complement Component C4a", type: "Add on" },
      { name: "Matrix Metalloproteinase-9", type: "Add on" },
      { name: "Osmolality", type: "Add on" },
      { name: "Plasminogen Activator Inhibitor-1 Ag", type: "Add on" },
      { name: "IgG Subclass 1", type: "Add on" },
      { name: "IgG Subclass 2", type: "Add on" },
      { name: "IgG Subclass 3", type: "Add on" },
      { name: "IgG Subclass 4", type: "Add on" },
      { name: "Immunoglobulin G (IgG)", type: "Add on" },
      { name: "Immunoglobulin M (IgM)", type: "Add on" },
      { name: "Immunoglobulin A (IgA)", type: "Add on" },
    ],
  },
  {
    title: "Female Health",
    tests: [
      { name: "Anti-Mullerian Hormone" },
      { name: "Pregnancy (hCG)", type: "Add on" },
      { name: "Sex Hormone Binding Globulin, Female" },
      { name: "Testosterone, Free, Female" },
      { name: "Follicle Stimulating Hormone, Female" },
      { name: "Luteinizing Hormone, Female" },
      { name: "Prolactin, Female" },
      { name: "Estradiol, Female" },
      { name: "DHEA-Sulfate (female)" },
      { name: "Androstenedione", type: "Add on" },
      { name: "Dihydrotestosterone (DHT)", type: "Add on" },
      { name: "MTHFR, DNA", type: "Add on" },
      { name: "Insulin-like Growth Factor (IGF-1)", type: "Add on" },
      { name: "Testosterone, Total, Female" },
    ],
  },
  {
    title: "Male Health",
    tests: [
      { name: "DHEA-Sulfate (male)" },
      { name: "Estradiol, Male" },
      { name: "Follicle Stimulating Hormone, Male" },
      { name: "Luteinizing Hormone, Male" },
      { name: "Prostate Specific Antigen (PSA), Free" },
      { name: "Prostate Specific Antigen (PSA) %, Free" },
      { name: "Prostate Specific Antigen (PSA), Total" },
      { name: "Sex Hormone Binding Globulin, Male" },
      { name: "Prolactin, Male" },
      { name: "Testosterone, Free, Male" },
      { name: "Androstenedione", type: "Add on" },
      { name: "Dihydrotestosterone (DHT)", type: "Add on" },
      { name: "Insulin-like Growth Factor (IGF-1)", type: "Add on" },
      { name: "Testosterone, Total, Male" },
      { name: "MTHFR, DNA", type: "Add on" },
    ],
  },
  {
    title: "Metabolic",
    tests: [
      { name: "Insulin", frequency: "2x" },
      { name: "Leptin" },
      { name: "Uric Acid" },
      { name: "Hemoglobin A1c (HbA1c)", frequency: "2x" },
      { name: "Glucose", frequency: "2x" },
      { name: "Adiponectin", type: "Add on" },
      { name: "C-peptide", type: "Add on" },
      { name: "Insulin Resistance Score", type: "Add on" },
      { name: "Insulin, Intact", type: "Add on" },
    ],
  },
  {
    title: "Nutrients",
    tests: [
      { name: "Arachidonic Acid/EPA Ratio" },
      { name: "Copper", type: "Add on" },
      { name: "Ferritin" },
      { name: "Homocysteine" },
      { name: "Iodine", type: "Add on" },
      { name: "Iron" },
      { name: "Iron Binding Capacity" },
      { name: "Iron % Saturation" },
      { name: "Magnesium" },
      { name: "Methylmalonic Acid" },
      { name: "Omega-3 Total" },
      { name: "Omega-6: Arachidonic Acid" },
      { name: "Omega-6: Linoleic Acid" },
      { name: "Omega-6 / Omega-3 Ratio" },
      { name: "Omega-6 Total" },
      { name: "Selenium", type: "Add on" },
      { name: "Vitamin D" },
      { name: "Zinc" },
      { name: "Chromium", type: "Add on" },
      { name: "Coenzyme Q10", type: "Add on" },
      { name: "Folate", type: "Add on" },
      { name: "Molybdenum", type: "Add on" },
      { name: "Vitamin A (Retinol)", type: "Add on" },
      { name: "Vitamin B12", type: "Add on" },
      { name: "Vitamin E (Alpha tocopherol)", type: "Add on" },
      { name: "MTHFR, DNA", type: "Add on" },
      { name: "Calcium", frequency: "2x" },
      { name: "Vitamin E (Beta-Gamma tocopherol)", type: "Add on" },
    ],
  },
  {
    title: "Stress & Aging",
    tests: [
      { name: "Biological Age", frequency: "2x" },
      { name: "Cortisol" },
      { name: "Insulin-like Growth Factor (IGF-1)", type: "Add on" },
      { name: "DHEA-Sulfate", type: "New" },
    ],
  },
  {
    title: "Liver",
    tests: [
      { name: "Alanine Transaminase", frequency: "2x" },
      { name: "Albumin", frequency: "2x", type: "Add on" },
      { name: "Alkaline Phosphatase", frequency: "2x" },
      { name: "Aspartate Aminotransferase", frequency: "2x" },
      { name: "Gamma-glutamyl Transferase" },
      { name: "Total Bilirubin", frequency: "2x" },
      { name: "Total Protein", frequency: "2x" },
      { name: "Globulin", frequency: "2x" },
    ],
  },
  {
    title: "Kidneys",
    tests: [
      { name: "Blood Urea Nitrogen", frequency: "2x" },
      { name: "BUN / Creatinine Ratio", frequency: "2x" },
      { name: "Creatinine", frequency: "2x" },
      { name: "Estimated Glomerular Filtration Rate", frequency: "2x" },
      { name: "Potassium", frequency: "2x" },
      { name: "Cystatin C", type: "Add on" },
      { name: "Calcium", frequency: "2x" },
      { name: "Chloride", frequency: "2x" },
      { name: "Sodium", frequency: "2x" },
      { name: "Albumin, Urine" },
    ],
  },
  {
    title: "Pancreas",
    tests: [{ name: "Amylase" }, { name: "Lipase" }],
  },
  {
    title: "Heavy Metals",
    tests: [
      { name: "Aluminum", type: "Add on" },
      { name: "Arsenic", type: "Add on" },
      { name: "Lead" },
      { name: "Mercury" },
    ],
  },
  {
    title: "Blood",
    tests: [
      { name: "ABO Group and Rhesus (Rh) Factor" },
      { name: "Hematocrit", frequency: "2x" },
      { name: "Hemoglobin", frequency: "2x" },
      {
        name: "Mean Corpuscular Hemoglobin Concentration (MCHC)",
        frequency: "2x",
      },
      { name: "Mean Corpuscular Hemoglobin (MCH)", frequency: "2x" },
      { name: "Mean Corpuscular Volume (MCV)", frequency: "2x" },
      { name: "Mean Platelet Volume (MPV)", frequency: "2x" },
      { name: "Platelet Count", frequency: "2x" },
      { name: "Red Blood Cell Count", frequency: "2x" },
      { name: "Red Cell Distribution Width (RDW)", frequency: "2x" },
    ],
  },
  {
    title: "Electrolytes",
    tests: [
      { name: "Chloride", frequency: "2x" },
      { name: "Potassium", frequency: "2x" },
      { name: "Sodium", frequency: "2x" },
      { name: "Carbon Dioxide", frequency: "2x" },
      { name: "Calcium", frequency: "2x" },
      { name: "Magnesium" },
    ],
  },
  {
    title: "Urine",
    tests: [
      { name: "Albumin, Urine" },
      { name: "Appearance, Urine", frequency: "2x" },
      { name: "Bilirubin", frequency: "2x" },
      { name: "Color, Urine", frequency: "2x" },
      { name: "Glucose, Urine", frequency: "2x" },
      { name: "Ketones, Urine", frequency: "2x" },
      { name: "Leukocytes", frequency: "2x" },
      { name: "Nitrite, Urine", frequency: "2x" },
      { name: "Occult Blood, Urine", frequency: "2x" },
      { name: "Protein, Urine", frequency: "2x" },
      { name: "Granular Casts", frequency: "2x", type: "New" },
      { name: "White Blood Cell, Urine", frequency: "2x", type: "New" },
      { name: "Red Blood Cell, Urine", frequency: "2x", type: "New" },
    ],
  },
  {
    title: "Brain Health",
    tests: [
      { name: "Amyloid Beta 40", type: "Add on" },
      { name: "Amyloid Beta 42", type: "Add on" },
      { name: "Beta-Amyloid 42/40 Ratio", type: "Add on" },
      { name: "P-tau217", type: "Add on" },
      { name: "Apolipoprotein E (ApoE)", type: "Add on" },
      { name: "MTHFR, DNA", type: "Add on" },
      { name: "Neurofilament Light Chain (NfL)", type: "Add on" },
    ],
  },
  {
    title: "Allergies & Sensitivities",
    tests: [
      { name: "Food Allergy Profile (IgE)", type: "Add on" },
      { name: "Indoor & Outdoor Allergy Profile (IgE)", type: "Add on" },
      { name: "Almond Allergy", type: "Add on" },
      { name: "Cashew Nut Allergy", type: "Add on" },
      { name: "Clam Allergy", type: "Add on" },
      { name: "Codfish Allergy", type: "Add on" },
      { name: "Cow's Milk Allergy", type: "Add on" },
      { name: "Crab Allergy", type: "Add on" },
      { name: "Egg White Allergy", type: "Add on" },
      { name: "Hazelnut Allergy", type: "Add on" },
      { name: "Lobster Allergy", type: "Add on" },
      { name: "Peanut Allergy", type: "Add on" },
      { name: "Salmon Allergy", type: "Add on" },
      { name: "Scallop Allergy", type: "Add on" },
      { name: "Sesame Seed Allergy", type: "Add on" },
      { name: "Shrimp Allergy", type: "Add on" },
      { name: "Soybean Allergy", type: "Add on" },
      { name: "Tuna Allergy", type: "Add on" },
      { name: "Walnut Allergy", type: "Add on" },
      { name: "Wheat Allergy", type: "Add on" },
      { name: "Cacao Sensitivity", type: "Add on" },
      { name: "Casein Sensitivity", type: "Add on" },
      { name: "Coffee Sensitivity", type: "Add on" },
      { name: "Maize / Corn Sensitivity", type: "Add on" },
      { name: "Tomato Sensitivity", type: "Add on" },
      { name: "Yeast Sensitivity", type: "Add on" },
    ],
  },
  {
    title: "Sexual Health",
    tests: [
      { name: "Chlamydia", type: "Add on" },
      { name: "Gonorrhea", type: "Add on" },
      { name: "Herpes Simplex Virus 1 and 2", type: "Add on" },
      { name: "HIV 1 & 2 Antigen-Antibody", type: "Add on" },
      { name: "Syphilis", type: "Add on" },
      { name: "Trichomoniasis", type: "Add on" },
    ],
  },
  {
    title: "Biological Age",
    tests: [{ name: "Biological Age", frequency: "2x" }],
  },
  {
    title: "Bone Health",
    tests: [
      { name: "Alpha-1 Globulin", type: "Add on" },
      { name: "Alpha-2 Globulin", type: "Add on" },
      { name: "Beta-1 Globulin", type: "Add on" },
      { name: "Beta-2 Globulin", type: "Add on" },
      { name: "Gamma Globulin", type: "Add on" },
      { name: "Ionized Calcium", type: "Add on" },
      { name: "Parathyroid Hormone, Intact", type: "Add on" },
      { name: "Serum Calcium", type: "Add on" },
      { name: "Albumin", type: "Add on" },
    ],
  },
  {
    title: "Environmental Toxins",
    tests: [
      { name: "Aluminum", type: "Add on" },
      { name: "Arsenic", type: "Add on" },
      { name: "PFAS-Branched Perfluorooctanoic Acid Isomers", type: "Add on" },
      {
        name: "PFAS-Branched Perfluorooctane Sulfonic Acid Isomers",
        type: "Add on",
      },
      { name: "PFAS- Linear Perfluorooctanoic Acid Isomers", type: "Add on" },
      {
        name: "PFAS- Linear Perfluorooctane Sulfonic Acid Isomers",
        type: "Add on",
      },
      { name: "PFAS- MeFOSAA", type: "Add on" },
      { name: "PFAS- NASEM Summation", type: "Add on" },
      { name: "PFAS- Perfluorononanoic Acid", type: "Add on" },
      { name: "PFAS- Perfluorohexane Sulfonic Acid", type: "Add on" },
      { name: "PFAS- Perfluorodecanoic Acid", type: "Add on" },
      { name: "PFAS- Perfluoroundecanoic Acid", type: "Add on" },
      { name: "Bisphenol A (BPA), Urine", type: "Add on" },
    ],
  },
  {
    title: "Infections",
    tests: [
      { name: "Lyme antibody Screen", type: "Add on" },
      {
        name: "Lyme- Anaplasma phagocytophilum Antibodies (IgG, IgM)",
        type: "Add on",
      },
      { name: "Lyme- Babesia duncani (WA1) Antibody (IgG)", type: "Add on" },
      { name: "Lyme- Babesia microti Antibodies (IgG, IgM)", type: "Add on" },
      {
        name: "Lyme- Bartonella henselae Antibodies (IgG, IgM)",
        type: "Add on",
      },
      {
        name: "Lyme- Bartonella quintana Antibodies (IgG, IgM)",
        type: "Add on",
      },
      {
        name: "Lyme- Borrelia miyamotoi Antibodies (IgG, IgM)",
        type: "Add on",
      },
      {
        name: "Lyme- Ehrlichia chaffeensis Antibodies (IgG, IgM)",
        type: "Add on",
      },
      { name: "Cytomegalovirus Antibodies (IgG, IgM)", type: "Add on" },
      {
        name: "Epstein-Barr Virus Early Antigen D Antibody (IgG)",
        type: "Add on",
      },
      {
        name: "Epstein-Barr Virus Nuclear Antigen Antibody (IgG)",
        type: "Add on",
      },
      { name: "Epstein-Barr Virus VCA Antibody (IgG, IgM)", type: "Add on" },
      { name: "Hepatitis A Antibody", type: "Add on" },
      { name: "Hepatitis B", type: "Add on" },
      { name: "Hepatitis C Antibody", type: "Add on" },
      { name: "Herpesvirus 6 Antibodies (IgG, IgM)", type: "Add on" },
      { name: "Lyme Antibody (IgG)", type: "Add on" },
      { name: "Lyme Antibody (IgM)", type: "Add on" },
    ],
  },
  {
    title: "Gut",
    tests: [{ name: "Gut Health Test", type: "Coming soon" }],
  },
];

const LabTestItem: React.FC<{ test: LabTest }> = ({ test }) => {
  const getTagColor = (type: string) => {
    switch (type) {
      case "2x":
        return "bg-gray-200 text-gray-700";
      case "Add on":
        return "bg-orange-200 text-orange-800";
      case "New":
        return "bg-orange-200 text-orange-800";
      case "Coming soon":
        return "bg-blue-200 text-blue-800";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const getTagText = (type: string) => {
    switch (type) {
      case "2x":
        return "2x";
      case "Add on":
        return "Add on";
      case "New":
        return "New";
      case "Coming soon":
        return "Coming soon";
      default:
        return type;
    }
  };

  return (
    <TouchableOpacity
      className="flex-row items-center justify-between py-4 border-b border-gray-200"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Add navigation to test details
      }}
    >
      <View className="flex-1 pr-4">
        <Text className="text-gray-600 text-base">{test.name}</Text>
      </View>
      <View className="flex-row items-center space-x-2">
        {test.frequency && (
          <View className={`px-2 py-1 rounded ${getTagColor(test.frequency)}`}>
            <Text className="text-xs font-medium">{test.frequency}</Text>
          </View>
        )}
        {test.type && (
          <View className={`px-2 py-1 rounded ${getTagColor(test.type)}`}>
            <Text className="text-xs font-medium">{getTagText(test.type)}</Text>
          </View>
        )}
        <Ionicons name="add" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );
};

const LabSection: React.FC<{ section: LabSection }> = ({ section }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExpanded(!isExpanded);
  };

  const getSectionIcon = (title: string) => {
    switch (title) {
      case "Heart":
        return "heart-outline";
      case "Thyroid":
        return "medical-outline";
      case "Cancer Detection":
        return "search-outline";
      case "Autoimmunity":
        return "shield-outline";
      case "Immune Regulation":
        return "cellular-outline";
      case "Female Health":
        return "female-outline";
      case "Male Health":
        return "male-outline";
      case "Metabolic":
        return "speedometer-outline";
      case "Nutrients":
        return "nutrition-outline";
      case "Stress & Aging":
        return "time-outline";
      case "Liver":
        return "leaf-outline";
      case "Kidneys":
        return "water-outline";
      case "Pancreas":
        return "ellipse-outline";
      case "Heavy Metals":
        return "warning-outline";
      case "Blood":
        return "water";
      case "Electrolytes":
        return "flash-outline";
      case "Urine":
        return "beaker-outline";
      case "Brain Health":
        return "bulb-outline";
      case "Allergies & Sensitivities":
        return "alert-circle-outline";
      case "Sexual Health":
        return "people-outline";
      case "Biological Age":
        return "hourglass-outline";
      case "Bone Health":
        return "body-outline";
      case "Environmental Toxins":
        return "skull-outline";
      case "Infections":
        return "bug-outline";
      case "Gut":
        return "restaurant-outline";
      default:
        return "flask-outline";
    }
  };

  return (
    <View className="mb-4">
      <TouchableOpacity
        className="flex-row items-center justify-between py-4"
        onPress={toggleExpanded}
        activeOpacity={1}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons
            name={getSectionIcon(section.title)}
            size={28}
            color="#d97706"
          />
          <Text className="text-2xl font-bold text-gray-800 ml-3">
            {section.title}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-gray-500 text-sm mr-3">
            {section.tests.length} tests
          </Text>
          <Ionicons
            name={isExpanded ? "remove" : "add"}
            size={24}
            color="#666"
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="ml-8">
          {section.tests.map((test, index) => (
            <LabTestItem key={index} test={test} />
          ))}
        </View>
      )}
    </View>
  );
};

const UserLabResultsSection: React.FC<{
  onRefreshChange?: (refreshing: boolean) => void;
  triggerRefresh?: boolean;
}> = ({ onRefreshChange, triggerRefresh }) => {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true); // Auto-expand when opening Labs tab
  const [refreshing, setRefreshing] = useState(false);

  // Cache management functions
  const loadCachedLabResults = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(LAB_RESULTS_CACHE_KEY);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const { data, timestamp } = parsedData;

        // Check if cache is still valid (not expired)
        const now = Date.now();
        const isExpired = now - timestamp > CACHE_EXPIRY_TIME;

        if (!isExpired && Array.isArray(data)) {
          setLabResults(data);
          console.log("Labs: Loaded cached data:");
          return true;
        } else {
          console.log("Labs: Cache expired or invalid, clearing...");
          await AsyncStorage.removeItem(LAB_RESULTS_CACHE_KEY);
        }
      }
      return false;
    } catch (err) {
      console.log("Labs: Failed to load cached data:");
      return false;
    }
  };

  const saveLabResultsToCache = async (labResultsData: LabResult[]) => {
    try {
      const cacheObject = {
        data: labResultsData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        LAB_RESULTS_CACHE_KEY,
        JSON.stringify(cacheObject),
      );
      console.log("Labs: Cached");
    } catch (err) {
      console.log("Labs: Failed to cache data:");
    }
  };

  const fetchLabResults = async (isBackgroundRefresh: boolean = false) => {
    try {
      if (isBackgroundRefresh) {
        setBackgroundLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log("Labs: Fetching user lab results...");
      const response = await authorizedFetch(routes.labResults);

      if (!response.ok) {
        throw new Error(`Failed to fetch lab results: ${response.status}`);
      }

      const data = await response.json();
      console.log("Labs: Fetched");

      const labResultsData = data.labResults || [];
      setLabResults(labResultsData);

      // Cache the fresh data
      await saveLabResultsToCache(labResultsData);

      setError(null);
    } catch (err) {
      console.error("Labs: Failed to fetch user lab results:");
      if (!isBackgroundRefresh) {
        setError(
          err instanceof Error ? err.message : "Failed to load lab results",
        );
      }
    } finally {
      if (isBackgroundRefresh) {
        setBackgroundLoading(false);
      } else {
        setLoading(false);
      }
      setRefreshing(false);
      onRefreshChange?.(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    onRefreshChange?.(true);
    await fetchLabResults(true); // Background refresh since we have data visible
  };

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExpanded(!isExpanded);
  };

  const handleDeleteLabResult = async (labResultId: string) => {
    try {
      console.log("Labs: Deleting lab result:");

      // Optimistic update - remove from UI immediately
      const updatedResults = labResults.filter(
        (result) => result.labResultId !== labResultId,
      );
      setLabResults(updatedResults);

      // Update cache with optimistic update
      await saveLabResultsToCache(updatedResults);

      const response = await authorizedFetch(
        routes.deleteLabResult(labResultId),
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to delete lab result: ${response.status}`);
      }

      console.log("Labs: Lab result deleted successfully");
    } catch (err) {
      console.error("Labs: Failed to delete lab result:");

      // Revert optimistic update on error
      await fetchLabResults(true);

      Alert.alert(
        "Delete Failed",
        "Failed to delete the lab result. Please try again.",
        [{ text: "OK" }],
      );
    }
  };

  // Load cached data first, then fetch fresh data
  useEffect(() => {
    const loadData = async () => {
      // Try to load cached data first
      const hasCachedData = await loadCachedLabResults();

      if (hasCachedData) {
        // If we have cached data, set loading to false and fetch fresh data in background
        setLoading(false);
        fetchLabResults(true); // Background refresh
      } else {
        // If no cached data, fetch fresh data normally
        await fetchLabResults(false);
      }
    };

    loadData();
  }, []);

  // Handle external refresh trigger
  useEffect(() => {
    if (triggerRefresh) {
      handleRefresh();
    }
  }, [triggerRefresh]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status?: string, flag?: string) => {
    if (flag === "HIGH" || status === "high") return "text-red-600";
    if (flag === "LOW" || status === "low") return "text-blue-600";
    if (flag === "CRITICAL" || status === "critical") return "text-red-800";
    if (status === "abnormal") return "text-orange-600";
    return "text-green-600";
  };

  return (
    <View className="mb-4">
      {loading && labResults.length === 0 ? (
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl font-bold text-gray-800">
              Your Lab Results
            </Text>
          </View>
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#d97706" />
            <Text className="text-gray-500 text-sm ml-2">Loading...</Text>
          </View>
        </View>
      ) : error && labResults.length === 0 ? (
        <TouchableOpacity
          className="flex-row items-center justify-between py-4"
          onPress={handleRefresh}
          activeOpacity={1}
        >
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl font-bold text-gray-800">
              Your Lab Results
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-red-500 text-sm mr-3">
              Error - Tap to retry
            </Text>
            <Ionicons name="refresh" size={24} color="#ef4444" />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="flex-row items-center justify-between py-4"
          onPress={toggleExpanded}
          activeOpacity={1}
        >
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl font-bold text-gray-800">
              Your Lab Results
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm mr-3">
              {labResults.length} result{labResults.length !== 1 ? "s" : ""}
            </Text>
            {backgroundLoading && (
              <ActivityIndicator
                size="small"
                color="#d97706"
                style={{ marginRight: 8 }}
              />
            )}
            <Ionicons
              name={isExpanded ? "remove" : "add"}
              size={24}
              color="#666"
            />
          </View>
        </TouchableOpacity>
      )}

      {isExpanded && (
        <View className="ml-8">
          {labResults.length === 0 ? (
            <View className="py-4 border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-gray-600 text-base">
                    No lab results yet
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Upload lab images in check-ins or chat to automatically
                    detect results
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/checkin");
                  }}
                  className="bg-orange-600 px-3 py-1 rounded"
                >
                  <Text className="text-white text-xs font-medium">
                    Check-in
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            labResults.map((labResult, index) => (
              <UserLabResultItem
                key={labResult.labResultId}
                labResult={labResult}
                isLast={index === labResults.length - 1}
                onDelete={handleDeleteLabResult}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
};

const UserLabResultItem: React.FC<{
  labResult: LabResult;
  isLast: boolean;
  onDelete: (labResultId: string) => void;
}> = ({ labResult, isLast, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Lab Result",
      "Are you sure you want to delete this lab result? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete(labResult.labResultId);
          },
        },
      ],
    );
  };

  const renderRightAction = () => (
    <View className="flex-row">
      <TouchableOpacity
        className="bg-red-500 w-20 justify-center items-center"
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color="white" />
        <Text className="text-white text-xs font-medium mt-1">Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status?: string, flag?: string) => {
    if (flag === "HIGH" || status === "high") return "text-red-600";
    if (flag === "LOW" || status === "low") return "text-blue-600";
    if (flag === "CRITICAL" || status === "critical") return "text-red-800";
    if (status === "abnormal") return "text-orange-600";
    return "text-green-600";
  };

  return (
    <Swipeable renderRightActions={renderRightAction} rightThreshold={80}>
      <View
        className={`${!isLast ? "border-b border-gray-200" : ""} bg-gray-100`}
      >
        <TouchableOpacity
          className="flex-row items-center justify-between py-4"
          onPress={toggleExpanded}
          activeOpacity={1}
        >
          <View className="flex-1 pr-4">
            <Text className="text-gray-800 text-base font-medium">
              {labResult.results?.labType || labResult.labType || "Lab Results"}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {formatDate(labResult.results?.labDate || labResult.labDate)}
              {(labResult.results?.labProvider || labResult.labProvider) &&
                ` • ${labResult.results?.labProvider || labResult.labProvider}`}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && labResult.results?.results && (
          <View className="pb-4">
            {labResult.results.results.map((result, index) => (
              <View
                key={index}
                className="mb-2 last:mb-0 bg-gray-50 p-3 rounded"
              >
                <View className="flex-row justify-between items-start">
                  <Text className="font-medium text-gray-800 flex-1 text-sm">
                    {result.testName}
                  </Text>
                  <View className="items-end ml-2">
                    <View className="flex-row items-center">
                      <Text
                        className={`font-semibold text-sm ${getStatusColor(result.status, result.flag)}`}
                      >
                        {result.value}
                        {result.unit ? ` ${result.unit}` : ""}
                      </Text>
                      {result.flag && (
                        <View
                          className={`ml-2 px-1 py-0.5 rounded ${result.flag === "HIGH" || result.flag === "CRITICAL" ? "bg-red-100" : result.flag === "LOW" ? "bg-blue-100" : "bg-gray-100"}`}
                        >
                          <Text
                            className={`text-xs font-bold ${result.flag === "HIGH" || result.flag === "CRITICAL" ? "text-red-800" : result.flag === "LOW" ? "text-blue-800" : "text-gray-800"}`}
                          >
                            {result.flag}
                          </Text>
                        </View>
                      )}
                    </View>
                    {result.referenceRange && (
                      <Text className="text-xs text-gray-500 mt-1">
                        Normal: {result.referenceRange}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Swipeable>
  );
};

export default function LabsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [triggerRefresh, setTriggerRefresh] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const pathname = usePathname();

  const openSidebar = () => {
    setSidebarVisible(true);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  const handleRefreshChange = (isRefreshing: boolean) => {
    setRefreshing(isRefreshing);
    if (!isRefreshing) {
      setTriggerRefresh(false);
    }
  };

  const handlePullToRefresh = () => {
    setTriggerRefresh(true);
  };

  return (
    <SlidingSidebar
      isVisible={sidebarVisible}
      onClose={closeSidebar}
      currentRoute={pathname}
    >
      <View className="flex-1 bg-gray-100">
        <Header onOpenSidebar={openSidebar} />

        <ScrollView
          className="flex-1 px-6 py-6"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              tintColor="#d97706"
              colors={["#d97706"]}
            />
          }
        >
          <UserLabResultsSection
            onRefreshChange={handleRefreshChange}
            triggerRefresh={triggerRefresh}
          />

          {/* Preventive Lab Tests Header */}
          <View className="mb-4 mt-2">
            <View className="py-4">
              <Text className="text-2xl font-bold text-gray-800">
                Preventive Lab Tests
              </Text>
            </View>
          </View>

          {labSections.map((section, index) => (
            <LabSection key={index} section={section} />
          ))}
        </ScrollView>
      </View>
    </SlidingSidebar>
  );
}
