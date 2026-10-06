import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import NavigationSelector from "@/components/health-tabs-selector";
import Header from "@/components/header";
import SlidingSidebar from "@/components/sliding-sidebar";

interface PreventionItem {
  name: string;
  dataStream: string;
  unit?: string;
  cadence: string;
  type?:
    | "Genomics"
    | "Lab"
    | "Imaging"
    | "Wearable"
    | "Check-in"
    | "Medication"
    | "Environment"
    | "Physio"
    | "Device";
}

interface PreventionSubsection {
  title: string;
  items: PreventionItem[];
}

interface PreventionSection {
  title: string;
  subsections: PreventionSubsection[];
}

const preventionSections: PreventionSection[] = [
  {
    title: "Cardiovascular",
    subsections: [
      {
        title: "Risk Assessment",
        items: [
          {
            name: "CAD Polygenic Risk Score",
            dataStream: "Genomics",
            cadence: "Once (20-40 y)",
            type: "Genomics",
          },
          {
            name: "LDLR/APOB/PCSK9 Pathogenic Variant",
            dataStream: "Genomics",
            cadence: "Once",
            type: "Genomics",
          },
          {
            name: "LDL-C",
            dataStream: "Lab",
            unit: "mg/dL",
            cadence: "Once, then see surveillance",
            type: "Lab",
          },
          {
            name: "ApoB",
            dataStream: "Lab",
            unit: "mg/dL",
            cadence: "Once, then see surveillance",
            type: "Lab",
          },
          {
            name: "Lp(a)",
            dataStream: "Lab",
            unit: "nmol/L",
            cadence: "Once",
            type: "Lab",
          },
          {
            name: "hs-CRP",
            dataStream: "Lab",
            unit: "mg/L",
            cadence: "Baseline, then see surveillance",
            type: "Lab",
          },
          {
            name: "HbA1c",
            dataStream: "Lab",
            unit: "%",
            cadence: "Baseline",
            type: "Lab",
          },
          {
            name: "CHIP Sequencing",
            dataStream: "Lab",
            cadence: "Once (≥50 y)",
            type: "Lab",
          },
          {
            name: "300-Protein Cardiac Proteome Score",
            dataStream: "Lab",
            cadence: "Baseline, then q 3 y",
            type: "Lab",
          },
          {
            name: "Coronary Calcium Score",
            dataStream: "Imaging",
            cadence: "Once at risk-stratifying age (40-50 y)",
            type: "Imaging",
          },
          {
            name: "CT-Coronary Plaque Volume",
            dataStream: "Imaging",
            cadence: "Once if calcium > 0",
            type: "Imaging",
          },
          {
            name: "Perivascular-Fat Inflammation Index",
            dataStream: "Imaging",
            cadence: "Once with CT-angio",
            type: "Imaging",
          },
          {
            name: "AI Retinal-Vascular Age",
            dataStream: "Imaging/AI",
            cadence: "Opportunistic whenever retinal image exists",
            type: "Imaging",
          },
          {
            name: "Baseline Systolic BP",
            dataStream: "Physio",
            unit: "mm Hg",
            cadence: "Once",
            type: "Physio",
          },
          {
            name: "Family History of Premature CAD",
            dataStream: "Check-in",
            cadence: "Once",
            type: "Check-in",
          },
        ],
      },
      {
        title: "Active Surveillance",
        items: [
          {
            name: "Mean Daytime SBP",
            dataStream: "Wearable",
            unit: "mm Hg",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "Mean DBP",
            dataStream: "Wearable",
            unit: "mm Hg",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "Resting Heart Rate",
            dataStream: "Wearable",
            unit: "bpm",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "Heart Rate Variability",
            dataStream: "Wearable",
            unit: "ms",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "AF/Irregular Rhythm Flag",
            dataStream: "Wearable",
            cadence: "Event-driven",
            type: "Wearable",
          },
          {
            name: "LDL-C",
            dataStream: "Lab",
            unit: "mg/dL",
            cadence: "q 6–12 mo",
            type: "Lab",
          },
          {
            name: "ApoB",
            dataStream: "Lab",
            unit: "mg/dL",
            cadence: "q 6–12 mo",
            type: "Lab",
          },
          {
            name: "hs-CRP",
            dataStream: "Lab",
            unit: "mg/L",
            cadence: "q 6–12 mo",
            type: "Lab",
          },
          {
            name: "Cardiac Proteome Score",
            dataStream: "Lab",
            cadence: "q 3 y",
            type: "Lab",
          },
          {
            name: "CT-Angio Plaque Volume",
            dataStream: "Imaging",
            cadence: "q 3–5 y (if plaque present)",
            type: "Imaging",
          },
        ],
      },
      {
        title: "Aggressive Prevention Actions",
        items: [
          {
            name: "Step Count",
            dataStream: "Wearable",
            unit: "steps/day",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "MVPA Minutes",
            dataStream: "Wearable",
            unit: "minutes",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "Strength Training Sessions",
            dataStream: "Wearable",
            cadence: "Weekly",
            type: "Wearable",
          },
          {
            name: "Body Weight",
            dataStream: "Wearable",
            unit: "kg",
            cadence: "Weekly",
            type: "Wearable",
          },
          {
            name: "BMI",
            dataStream: "Wearable",
            cadence: "Weekly",
            type: "Wearable",
          },
          {
            name: "Waist Circumference",
            dataStream: "Wearable",
            unit: "cm",
            cadence: "Monthly",
            type: "Wearable",
          },
          {
            name: "Sleep Hours",
            dataStream: "Wearable",
            unit: "hours",
            cadence: "Nightly",
            type: "Wearable",
          },
          {
            name: "Sleep Efficiency",
            dataStream: "Wearable",
            unit: "%",
            cadence: "Nightly",
            type: "Wearable",
          },
          {
            name: "Mediterranean Diet Score",
            dataStream: "Check-in",
            unit: "0-14",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Fiber Intake",
            dataStream: "Check-in",
            unit: "grams/day",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Olive Oil Intake",
            dataStream: "Check-in",
            unit: "tbsp/day",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Red/Processed Meat",
            dataStream: "Check-in",
            unit: "servings/week",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Ultra-Processed Food",
            dataStream: "Check-in",
            unit: "servings/week",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Statin Pill Taken",
            dataStream: "Medication IoT",
            cadence: "Daily",
            type: "Medication",
          },
          {
            name: "PCSK9-i Injection",
            dataStream: "Medication",
            cadence: "Per dose",
            type: "Medication",
          },
          {
            name: "Colchicine Dose",
            dataStream: "Medication",
            cadence: "Daily",
            type: "Medication",
          },
          {
            name: "GLP-1 Agonist Dose",
            dataStream: "Medication",
            cadence: "Per dose",
            type: "Medication",
          },
          {
            name: "Serum PFAS",
            dataStream: "Environment",
            unit: "ng/mL",
            cadence: "q 5 y",
            type: "Environment",
          },
          {
            name: "Blood Microplastic Index",
            dataStream: "Environment",
            cadence: "Research / q 5 y",
            type: "Environment",
          },
          {
            name: "Residential PM2.5",
            dataStream: "Environment/API",
            unit: "µg m-³",
            cadence: "Continuous",
            type: "Environment",
          },
        ],
      },
    ],
  },
  {
    title: "Cancer",
    subsections: [
      {
        title: "Risk Assessment",
        items: [
          {
            name: "Germline Pathogenic Variants",
            dataStream: "Genomics",
            cadence: "Once",
            type: "Genomics",
          },
          {
            name: "Breast PRS Percentile",
            dataStream: "Genomics",
            cadence: "Once",
            type: "Genomics",
          },
          {
            name: "Prostate PRS Percentile",
            dataStream: "Genomics",
            cadence: "Once",
            type: "Genomics",
          },
          {
            name: "Colon PRS Percentile",
            dataStream: "Genomics",
            cadence: "Once",
            type: "Genomics",
          },
          {
            name: "Melanoma PRS Percentile",
            dataStream: "Genomics",
            cadence: "Once",
            type: "Genomics",
          },
          {
            name: "CHIP Sequencing",
            dataStream: "Lab",
            cadence: "Once (≥50 y)",
            type: "Lab",
          },
          {
            name: "hs-CRP",
            dataStream: "Lab",
            unit: "mg/L",
            cadence: "Baseline",
            type: "Lab",
          },
          {
            name: "Pan-Cancer Proteomic Panel Score",
            dataStream: "Lab",
            cadence: "Baseline, then q 3 y",
            type: "Lab",
          },
          {
            name: "Baseline Tailored MRI/CT",
            dataStream: "Imaging",
            cadence: "Once (as indicated)",
            type: "Imaging",
          },
          {
            name: "PFAS Serum",
            dataStream: "Environment",
            unit: "ng/mL",
            cadence: "Baseline",
            type: "Environment",
          },
          {
            name: "Cumulative Ionising Dose",
            dataStream: "Environment/Imaging-log",
            unit: "mSv",
            cadence: "Continuous",
            type: "Environment",
          },
          {
            name: "Tobacco Pack-Years",
            dataStream: "Check-in",
            cadence: "Once + updates",
            type: "Check-in",
          },
          {
            name: "Alcohol Units",
            dataStream: "Check-in",
            unit: "units/week",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Processed Meat Intake",
            dataStream: "Check-in",
            unit: "servings/week",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Chemical Exposure Flag",
            dataStream: "Check-in",
            cadence: "Annual",
            type: "Check-in",
          },
        ],
      },
      {
        title: "Active Surveillance",
        items: [
          {
            name: "Multi-Cancer cfDNA Result",
            dataStream: "Lab",
            cadence: "Annual (if high-risk)",
            type: "Lab",
          },
          {
            name: "Proteomic Early-Signal Score",
            dataStream: "Lab",
            cadence: "q 3 y",
            type: "Lab",
          },
          {
            name: "AI Mammogram BIRADS",
            dataStream: "Imaging",
            cadence: "q 1–2 y",
            type: "Imaging",
          },
          {
            name: "Low-Dose CT Lung Nodule Size",
            dataStream: "Imaging",
            cadence: "Annual (smoker/high PRS)",
            type: "Imaging",
          },
          {
            name: "Colonoscopy Adenoma Count",
            dataStream: "Imaging",
            cadence: "q 10 y or PRS-driven",
            type: "Imaging",
          },
          {
            name: "UV-Index Exposure",
            dataStream: "Wearable",
            cadence: "Continuous",
            type: "Wearable",
          },
          {
            name: "PSA",
            dataStream: "Lab",
            unit: "ng/mL",
            cadence: "Annual (men ≥50 y or risk)",
            type: "Lab",
          },
          {
            name: "FIT Stool Test",
            dataStream: "Lab",
            cadence: "Annual (if no colonoscopy)",
            type: "Lab",
          },
        ],
      },
      {
        title: "Aggressive Prevention Actions",
        items: [
          {
            name: "HPV Vaccine Status",
            dataStream: "Vaccine-record",
            cadence: "Once",
            type: "Medication",
          },
          {
            name: "HBV Vaccine Status",
            dataStream: "Vaccine-record",
            cadence: "Once",
            type: "Medication",
          },
          {
            name: "Steps per Day",
            dataStream: "Wearable",
            unit: "steps/day",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "Sleep Hours",
            dataStream: "Wearable",
            unit: "hours/night",
            cadence: "Nightly",
            type: "Wearable",
          },
          {
            name: "BMI",
            dataStream: "Wearable",
            cadence: "Weekly",
            type: "Wearable",
          },
          {
            name: "Mediterranean Diet Score",
            dataStream: "Check-in",
            unit: "0-14",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Fruit + Vegetable Servings",
            dataStream: "Check-in",
            unit: "servings/day",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Alcohol Units",
            dataStream: "Check-in",
            unit: "units/week",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Sunscreen Applications",
            dataStream: "Check-in",
            unit: "applications/day",
            cadence: "Daily (summer)",
            type: "Check-in",
          },
          {
            name: "Home Radon Level",
            dataStream: "Environment",
            unit: "pCi/L",
            cadence: "q 5 y",
            type: "Environment",
          },
        ],
      },
    ],
  },
  {
    title: "Dementia / Alzheimer's",
    subsections: [
      {
        title: "Risk Assessment",
        items: [
          {
            name: "APOE Genotype",
            dataStream: "Genomics",
            cadence: "Once",
            type: "Genomics",
          },
          {
            name: "AD PRS Percentile",
            dataStream: "Genomics",
            cadence: "Once",
            type: "Genomics",
          },
          {
            name: "Plasma p-tau217",
            dataStream: "Lab",
            unit: "pg/mL",
            cadence: "Once ≥50 y",
            type: "Lab",
          },
          {
            name: "GFAP",
            dataStream: "Lab",
            unit: "pg/mL",
            cadence: "Once",
            type: "Lab",
          },
          {
            name: "Hippocampal Volume",
            dataStream: "Imaging/MRI",
            unit: "cm³",
            cadence: "Once (if high PRS)",
            type: "Imaging",
          },
          {
            name: "Audiogram Threshold",
            dataStream: "Check-in/App",
            unit: "dB",
            cadence: "Once",
            type: "Check-in",
          },
          {
            name: "Digital Cognition Baseline Score",
            dataStream: "Digital-test",
            cadence: "Once",
            type: "Check-in",
          },
          {
            name: "PHQ-9 Depression Score",
            dataStream: "Check-in",
            cadence: "Annual",
            type: "Check-in",
          },
          {
            name: "Social Isolation Contacts",
            dataStream: "Check-in",
            unit: "contacts/week",
            cadence: "Weekly",
            type: "Check-in",
          },
        ],
      },
      {
        title: "Active Surveillance",
        items: [
          {
            name: "Sleep Duration",
            dataStream: "Wearable",
            unit: "hours",
            cadence: "Nightly",
            type: "Wearable",
          },
          {
            name: "Sleep Efficiency",
            dataStream: "Wearable",
            unit: "%",
            cadence: "Nightly",
            type: "Wearable",
          },
          {
            name: "Gait Speed",
            dataStream: "Wearable/Phone",
            unit: "m/s",
            cadence: "Weekly",
            type: "Wearable",
          },
          {
            name: "HRV",
            dataStream: "Wearable",
            unit: "ms",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "p-tau217 Repeat",
            dataStream: "Lab",
            unit: "pg/mL",
            cadence: "Annual if baseline positive",
            type: "Lab",
          },
          {
            name: "5-Min Digital Cognition Score",
            dataStream: "Digital-test",
            cadence: "Annual",
            type: "Check-in",
          },
          {
            name: "Amyloid/Tau PET SUVR",
            dataStream: "Imaging",
            cadence: "q 3–5 y (if indicated)",
            type: "Imaging",
          },
        ],
      },
      {
        title: "Aggressive Prevention Actions",
        items: [
          {
            name: "Step Count",
            dataStream: "Wearable",
            unit: "steps/day",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "MVPA Minutes",
            dataStream: "Wearable",
            unit: "minutes/week",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "Strength Sessions",
            dataStream: "Wearable",
            unit: "sessions/week",
            cadence: "Weekly",
            type: "Wearable",
          },
          {
            name: "Sleep Hours",
            dataStream: "Wearable",
            unit: "hours/night",
            cadence: "Nightly",
            type: "Wearable",
          },
          {
            name: "MIND Diet Score",
            dataStream: "Check-in",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Ultra-Processed Food",
            dataStream: "Check-in",
            unit: "servings/week",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Olive Oil Intake",
            dataStream: "Check-in",
            unit: "grams/day",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Cognitive Training Sessions",
            dataStream: "Check-in/Digital-app",
            unit: "sessions/week",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Social Interaction Count",
            dataStream: "Check-in",
            unit: "interactions/week",
            cadence: "Weekly",
            type: "Check-in",
          },
          {
            name: "Mean SBP",
            dataStream: "Wearable",
            unit: "mm Hg",
            cadence: "Daily",
            type: "Wearable",
          },
          {
            name: "BMI",
            dataStream: "Wearable",
            cadence: "Weekly",
            type: "Wearable",
          },
          {
            name: "Hearing Aid Usage",
            dataStream: "Device",
            unit: "hrs/day",
            cadence: "Daily",
            type: "Device",
          },
          {
            name: "Anti-Amyloid Infusion",
            dataStream: "Medication/Infusion",
            cadence: "Per dose",
            type: "Medication",
          },
          {
            name: "Gamma-Frequency Light Session",
            dataStream: "Device",
            unit: "min/day",
            cadence: "Daily (research)",
            type: "Device",
          },
        ],
      },
    ],
  },
];

const PreventionItem: React.FC<{ item: PreventionItem }> = ({ item }) => {
  const getTagColor = (type?: string) => {
    switch (type) {
      case "Genomics":
        return "bg-purple-200 text-purple-800";
      case "Lab":
        return "bg-blue-200 text-blue-800";
      case "Imaging":
        return "bg-green-200 text-green-800";
      case "Wearable":
        return "bg-orange-200 text-orange-800";
      case "Check-in":
        return "bg-gray-200 text-gray-700";
      case "Medication":
        return "bg-red-200 text-red-800";
      case "Environment":
        return "bg-yellow-200 text-yellow-800";
      case "Physio":
        return "bg-teal-200 text-teal-800";
      case "Device":
        return "bg-indigo-200 text-indigo-800";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  return (
    <TouchableOpacity
      className="flex-row items-center justify-between py-3 border-b border-gray-200"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <View className="flex-1 pr-4">
        <Text className="text-gray-600 text-base">{item.name}</Text>
        <Text className="text-gray-400 text-sm mt-1">{item.cadence}</Text>
        {item.unit && (
          <Text className="text-gray-400 text-xs mt-1">Unit: {item.unit}</Text>
        )}
      </View>
      <View className="flex-row items-center space-x-2">
        {item.type && (
          <View className={`px-2 py-1 rounded ${getTagColor(item.type)}`}>
            <Text className="text-xs font-medium">{item.type}</Text>
          </View>
        )}
        <Ionicons name="add" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );
};

const PreventionSubsection: React.FC<{ subsection: PreventionSubsection }> = ({
  subsection,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExpanded(!isExpanded);
  };

  return (
    <View className="mb-3">
      <TouchableOpacity
        className="flex-row items-center justify-between py-3 border-b border-gray-200"
        onPress={toggleExpanded}
      >
        <Text className="text-lg font-semibold text-gray-700 flex-1">
          {subsection.title}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-gray-500 text-sm mr-3">
            {subsection.items.length} items
          </Text>
          <Ionicons
            name={isExpanded ? "remove" : "add"}
            size={20}
            color="#666"
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="mt-2">
          {subsection.items.map((item, index) => (
            <PreventionItem key={index} item={item} />
          ))}
        </View>
      )}
    </View>
  );
};

const PreventionSection: React.FC<{ section: PreventionSection }> = ({
  section,
}) => {
  const getSectionIcon = (title: string) => {
    switch (title) {
      case "Cardiovascular":
        return "heart-outline";
      case "Cancer":
        return "search-outline";
      case "Dementia / Alzheimer's":
        return "bulb-outline";
      default:
        return "shield-outline";
    }
  };

  const getTotalItems = (section: PreventionSection) => {
    return section.subsections.reduce(
      (total, subsection) => total + subsection.items.length,
      0,
    );
  };

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between py-4">
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
            {getTotalItems(section)} items
          </Text>
        </View>
      </View>

      <View className="ml-8">
        {section.subsections.map((subsection, index) => (
          <PreventionSubsection key={index} subsection={subsection} />
        ))}
      </View>
    </View>
  );
};

export default function PreventionScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const pathname = usePathname();

  const openSidebar = () => {
    setSidebarVisible(true);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  return (
    <SlidingSidebar
      isVisible={sidebarVisible}
      onClose={closeSidebar}
      currentRoute={pathname}
    >
      <View className="flex-1 bg-gray-100">
        <Header onOpenSidebar={openSidebar} />

        <ScrollView className="flex-1 px-6 py-6">
          {preventionSections.map((section, index) => (
            <PreventionSection key={index} section={section} />
          ))}
        </ScrollView>
      </View>
    </SlidingSidebar>
  );
}
