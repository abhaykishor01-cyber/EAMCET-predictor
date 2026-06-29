import React, { useState, useMemo, useEffect } from "react";
import {
  GraduationCap,
  Search,
  Award,
  Heart,
  Download,
  TrendingUp,
  MapPin,
  AlertCircle,
  ExternalLink,
  X,
  ChevronRight,
  Info,
  Calendar,
  Building2,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
  HelpCircle,
  Share2
} from "lucide-react";
import {
  COLLEGES,
  CATEGORIES,
  GENDERS,
  STREAMS,
  MPC_BRANCHES,
  BIPC_BRANCHES,
  DISTRICTS,
  REGIONS,
  College,
  BranchData
} from "./data/colleges";
import jsPDF from "jspdf";
import {
  incrementPredictionCount,
  incrementPdfDownloadCount,
  subscribeToStats
} from "./services/stats";
interface PredictedOption {
  college: College;
  branch: BranchData;
  cutoff2025: number;
  cutoff2024: number;
  cutoff2023: number;
  cutoff2022: number;
  chance: "Safe" | "Borderline" | "Difficult";
  ratio: number; // studentRank / cutoff2025
}

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<"predictor" | "trends" | "explorer">("predictor");

  // Stream Selector
  const [stream, setStream] = useState<"MPC" | "BIPC">("MPC");

  // Dynamically computed branch list depending on active stream
  const BRANCHES = useMemo(() => {
    return stream === "MPC" ? MPC_BRANCHES : BIPC_BRANCHES;
  }, [stream]);

  // Predictor Form State
  const [rankInput, setRankInput] = useState<string>("");
  const [category, setCategory] = useState<string>("OC");
  const [gender, setGender] = useState<string>("Co-Ed");
  const [branch, setBranch] = useState<string>("ALL");
  const [district, setDistrict] = useState<string>("ALL");
  const [region, setRegion] = useState<string>("ALL");
  const [collegeType, setCollegeType] = useState<string>("ALL");

  // Predictor Results & Controls
  const [chanceFilter, setChanceFilter] = useState<string>("RECOMMENDED");
  const [hasPredicted, setHasPredicted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showShortlistedOnly, setShowShortlistedOnly] = useState<boolean>(false);
  const [sortKey, setSortKey] = useState<"rank" | "chance" | "name">("rank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [shortlistedKeys, setShortlistedKeys] = useState<Set<string>>(new Set());

  // Modal State
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  // Cutoff Trends Selection
  const [trendCollegeId, setTrendCollegeId] = useState<string>("1");
  const [trendBranchCode, setTrendBranchCode] = useState<string>("CSE");

  // State to track social sharing indicator
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Form Submission Validation
  const [formError, setFormError] = useState<string>("");

  const [predictionCount, setPredictionCount] = useState(0);
const [pdfDownloadCount, setPdfDownloadCount] = useState(0);
useEffect(() => {
  const unsubscribe = subscribeToStats((stats) => {
    setPredictionCount(stats.predictionCount || 0);
    setPdfDownloadCount(stats.pdfDownloadCount || 0);
  });

  return () => unsubscribe();
}, []);
  // Handle Predict Action
  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    const rankNum = parseInt(rankInput);
    if (isNaN(rankNum) || rankNum <= 0) {
      setFormError("Please enter a valid rank greater than 0");
      return;
    }
    if (rankNum > 200000) {
      setFormError("AP EAMCET ranks typically range from 1 to 200,000. Please check your rank.");
      return;
    }
    setFormError("");
    setHasPredicted(true);
    incrementPredictionCount().catch(console.error);
    // Scroll smoothly to results
    setTimeout(() => {
      document.getElementById("predictions-results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Reset Predictor Form
  const handleReset = () => {
    setRankInput("");
    setCategory("OC");
    setGender("Co-Ed");
    setBranch("ALL");
    setDistrict("ALL");
    setRegion("ALL");
    setCollegeType("ALL");
    setStream("MPC");
    setChanceFilter("RECOMMENDED");
    setHasPredicted(false);
    setSearchQuery("");
    setShowShortlistedOnly(false);
  };

  // Process and Filter Predictions
  const predictions = useMemo(() => {
    if (!hasPredicted) return [];
    const rankNum = parseInt(rankInput) || 0;

    const list: PredictedOption[] = [];

    COLLEGES.forEach((college) => {
      // District Filter
      if (district !== "ALL" && college.district !== district) return;
      // Region Filter
      if (region !== "ALL" && college.region !== region) return;
      // College Type Filter
      if (collegeType !== "ALL" && college.type !== collegeType) return;

      college.branches.forEach((branchData) => {
        // Stream Filter (MPC vs BiPC)
        if (branchData.stream !== stream) return;

        // Branch Filter
        if (branch !== "ALL" && branchData.code !== branch) return;

        // Extract cutoffs
        const catCutoffs = branchData.cutoffs[category];
        if (!catCutoffs) return;
        const genderCutoffs = catCutoffs[gender];
        if (!genderCutoffs) return;

        const cutoff2025 = genderCutoffs[2025] || 0;
        const cutoff2024 = genderCutoffs[2024] || 0;
        const cutoff2023 = genderCutoffs[2023] || 0;
        const cutoff2022 = genderCutoffs[2022] || 0;

        if (cutoff2025 === 0) return;

        // Calculate chance:
        // Safe: Rank is better (smaller) or equal to cutoff rank
        // Borderline: Rank is up to 20% higher than the cutoff
        // Difficult: Rank is more than 20% higher than the cutoff
        let chance: "Safe" | "Borderline" | "Difficult" = "Difficult";
        const ratio = rankNum / cutoff2025;

        if (rankNum <= cutoff2025) {
          chance = "Safe";
        } else if (rankNum <= cutoff2025 * 1.20) {
          chance = "Borderline";
        }

        list.push({
          college,
          branch: branchData,
          cutoff2025,
          cutoff2024,
          cutoff2023,
          cutoff2022,
          chance,
          ratio
        });
      });
    });

    return list;
  }, [hasPredicted, rankInput, category, gender, branch, district, region, collegeType, stream]);

  // Determine single best "Top Pick" among the predicted options
  const topPickKey = useMemo(() => {
    if (predictions.length === 0) return null;

    // Filter Safe matches first. If none, look at Borderline.
    let candidates = predictions.filter((p) => p.chance === "Safe");
    if (candidates.length === 0) {
      candidates = predictions.filter((p) => p.chance === "Borderline");
    }
    if (candidates.length === 0) return null;

    // Score based on NAAC grade and College Type (Govt gets bonus)
    const scoreCandidate = (c: PredictedOption) => {
      let score = 0;
      if (c.college.naac === "A++") score += 10;
      else if (c.college.naac === "A+") score += 8;
      else if (c.college.naac === "A") score += 6;

      if (c.college.type === "Govt") score += 5;
      return score;
    };

    // Sort candidates by score descending. If tied, sort by best ratio (safest)
    const sorted = [...candidates].sort((a, b) => {
      const scoreA = scoreCandidate(a);
      const scoreB = scoreCandidate(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.ratio - b.ratio; // lower ratio is safer/better
    });

    const best = sorted[0];
    return `${best.college.code}-${best.branch.code}`;
  }, [predictions]);

  // Filter & Sort processed predictions for the display list
  const displayPredictions = useMemo(() => {
    let list = [...predictions];

    // Local Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.college.name.toLowerCase().includes(q) ||
          p.college.code.toLowerCase().includes(q) ||
          p.branch.name.toLowerCase().includes(q) ||
          p.branch.code.toLowerCase().includes(q)
      );
    }

    // Shortlisted Filter
    if (showShortlistedOnly) {
      list = list.filter((p) => shortlistedKeys.has(`${p.college.code}-${p.branch.code}`));
    }

    // Admission Chance Filter
    if (chanceFilter === "RECOMMENDED") {
      list = list.filter((p) => p.chance === "Safe" || p.chance === "Borderline");
    } else if (chanceFilter === "SAFE") {
      list = list.filter((p) => p.chance === "Safe");
    }

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      if (sortKey === "rank") {
        comparison = a.cutoff2025 - b.cutoff2025;
      } else if (sortKey === "name") {
        comparison = a.college.name.localeCompare(b.college.name);
      } else if (sortKey === "chance") {
        const priority = { Safe: 1, Borderline: 2, Difficult: 3 };
        comparison = priority[a.chance] - priority[b.chance];
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return list;
  }, [predictions, searchQuery, showShortlistedOnly, shortlistedKeys, sortKey, sortOrder, chanceFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = displayPredictions.length;
    const safe = predictions.filter((p) => p.chance === "Safe").length;
    const borderline = predictions.filter((p) => p.chance === "Borderline").length;
    const difficult = predictions.filter((p) => p.chance === "Difficult").length;

    return { total, safe, borderline, difficult };
  }, [predictions, displayPredictions]);

  // Toggle Shortlist Booking
  const toggleShortlist = (collegeCode: string, branchCode: string) => {
    const key = `${collegeCode}-${branchCode}`;
    const next = new Set(shortlistedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setShortlistedKeys(next);
  };

  // PDF Download Trigger
  const handleDownloadPDF = (shortlistOnly = false) => {
    const listToExport = shortlistOnly
      ? displayPredictions.filter((p) => shortlistedKeys.has(`${p.college.code}-${p.branch.code}`))
      : displayPredictions;

    if (listToExport.length === 0) {
      alert(shortlistOnly ? "No shortlisted colleges to download!" : "No predictions to download!");
      return;
    }

    const params = {
      rank: rankInput,
      category,
      gender,
      stream: stream,
      branch: BRANCHES.find((b) => b.value === branch)?.label || branch,
      district: DISTRICTS.find((d) => d.value === district)?.label || district,
      region: REGIONS.find((r) => r.value === region)?.label || region
    };

    // Trigger PDF Generation
    incrementPdfDownloadCount().catch(console.error);
    generatePDF(listToExport, params, shortlistOnly);
  };

  // PDF Generation Function
  const generatePDF = (options: PredictedOption[], params: any, isShortlistOnly = false) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Primary Colors
    // Navy: #1e3a8a, Accent Blue: #3b82f6, Text Slate: #334155
    doc.setFillColor(30, 58, 138); // #1e3a8a
    doc.rect(0, 0, 210, 35, "F");

    // Title / Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EamcetAdvisor", 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("AP EAMCET 2026 College Admissions Predictor", 15, 26);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 150, 18);
    doc.text("Reference Cutoff: 2025 Data", 150, 25);

    // Profile Box
    doc.setFillColor(241, 245, 249); // bg-slate-100
    doc.rect(15, 42, 180, 28, "F");

    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Student Admission Profile Criteria", 20, 48);

    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Stream: ${params.stream === "MPC" ? "MPC (Engineering)" : "BiPC (Agri & Pharmacy)"}`, 20, 56);
    doc.text(`Rank: ${params.rank}`, 105, 56);
    doc.text(`Category: ${params.category}`, 140, 56);
    doc.text(`Gender: ${params.gender}`, 168, 56);

    // Filter Criteria Details
    doc.text(`Branch: ${params.branch}`, 20, 63);
    doc.text(`District: ${params.district}`, 105, 63);
    doc.text(`Region: ${params.region}`, 140, 63);

    // Divider Line
    doc.setDrawColor(203, 213, 225);
    doc.line(15, 76, 195, 76);

    // Section Title
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const titleText = isShortlistOnly ? "My Shortlisted Colleges & Admissions Chances" : "Predicted Admissions Opportunities";
    doc.text(titleText, 15, 84);

    // Stats breakdown
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const safeCount = options.filter((o) => o.chance === "Safe").length;
    const borderlineCount = options.filter((o) => o.chance === "Borderline").length;
    const difficultCount = options.filter((o) => o.chance === "Difficult").length;
    doc.text(`Total Choices: ${options.length}   |   Safe: ${safeCount}   |   Borderline: ${borderlineCount}   |   Difficult: ${difficultCount}`, 15, 89);

    // Table Header Coordinates
    let y = 96;
    doc.setFillColor(226, 232, 240); // Slate header background
    doc.rect(15, y, 180, 8, "F");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("S.No", 17, y + 5.5);
    doc.text("College Name (Code)", 27, y + 5.5);
    doc.text("Branch", 112, y + 5.5);
    doc.text("District", 137, y + 5.5);
    doc.text("Cutoff Rank", 160, y + 5.5);
    doc.text("Chance", 182, y + 5.5);

    y += 8;

    // Draw row elements
    options.forEach((opt, idx) => {
      // Check for Page Overflow
      if (y > 270) {
        doc.addPage();
        // Page header replication
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, 210, 14, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("EamcetAdvisor - Admission Predictions (Continued)", 15, 9);

        // Reset Y and header row
        y = 22;
        doc.setFillColor(226, 232, 240);
        doc.rect(15, y, 180, 8, "F");
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("S.No", 17, y + 5.5);
        doc.text("College Name (Code)", 27, y + 5.5);
        doc.text("Branch", 112, y + 5.5);
        doc.text("District", 137, y + 5.5);
        doc.text("Cutoff Rank", 160, y + 5.5);
        doc.text("Chance", 182, y + 5.5);

        y += 8;
      }

      // Alternating Row Background
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252); // extremely light slate
        doc.rect(15, y, 180, 9, "F");
      }

      // S.No
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text((idx + 1).toString(), 17, y + 6);

      // College Name
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      let colName = `${opt.college.name} (${opt.college.code})`;
      if (colName.length > 51) {
        colName = colName.substring(0, 48) + "...";
      }
      doc.text(colName, 27, y + 6);

      // Branch code
      doc.setFont("helvetica", "normal");
      doc.text(opt.branch.code, 112, y + 6);

      // District
      doc.text(opt.college.district, 137, y + 6);

      // Cutoff
      doc.text(opt.cutoff2025.toLocaleString(), 160, y + 6);

      // Color-coded Chance badge
      if (opt.chance === "Safe") {
        doc.setFillColor(220, 252, 231); // light green
        doc.rect(181, y + 1.8, 12, 5.2, "F");
        doc.setTextColor(21, 128, 61); // deep green
        doc.setFont("helvetica", "bold");
        doc.text("Safe", 183.5, y + 5.4);
      } else if (opt.chance === "Borderline") {
        doc.setFillColor(254, 243, 199); // light amber
        doc.rect(181, y + 1.8, 12, 5.2, "F");
        doc.setTextColor(180, 83, 9); // deep amber
        doc.setFont("helvetica", "bold");
        doc.text("Bordr", 182.2, y + 5.4);
      } else {
        doc.setFillColor(254, 226, 226); // light red
        doc.rect(181, y + 1.8, 12, 5.2, "F");
        doc.setTextColor(185, 28, 28); // deep red
        doc.setFont("helvetica", "bold");
        doc.text("Diff", 184.2, y + 5.4);
      }

      // Thin separator line
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 9, 195, y + 9);

      y += 9;
    });

    // Check bottom margin for disclaimer block
    if (y > 255) {
      doc.addPage();
      y = 15;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 5, 195, y + 5);

    // Disclaimer
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("Official Academic Counselling Notice: EamcetAdvisor uses audited previous years (AP EAMCET 2025) official counseling reports.", 15, y + 12);
    doc.text("Actual 2026 cutoffs may fluctuate based on candidate choices, registrations, and available seat counts. Do use this list as an essential preference guide.", 15, y + 16);
    doc.text("Download produced by EamcetAdvisor (https://eamcetadvisor.com) - Trusted Admissions Partner.", 15, y + 20);

    // Save
    const filename = isShortlistOnly
      ? `EAMCET_Shortlist_Rank_${params.rank}_${params.category}.pdf`
      : `EAMCET_Predictor_All_Rank_${params.rank}_${params.category}.pdf`;
    doc.save(filename);
  };

  // Selected college and branch cutoff values for Cutoff Trends section
  const trendData = useMemo(() => {
    const col = COLLEGES.find((c) => c.id === trendCollegeId);
    if (!col) return null;
    const br = col.branches.find((b) => b.code === trendBranchCode);
    if (!br) return null;

    const catCutoffs = br.cutoffs[category];
    if (!catCutoffs) return null;
    const genderCutoffs = catCutoffs[gender];
    if (!genderCutoffs) return null;

    return {
      college: col,
      branch: br,
      years: [
        { year: 2022, rank: genderCutoffs[2022] || 0 },
        { year: 2023, rank: genderCutoffs[2023] || 0 },
        { year: 2024, rank: genderCutoffs[2024] || 0 },
        { year: 2025, rank: genderCutoffs[2025] || 0 }
      ]
    };
  }, [trendCollegeId, trendBranchCode, category, gender]);

  // Compute percentage changes and trend analysis string
  const trendAnalysis = useMemo(() => {
    if (!trendData || trendData.years.length < 2) return "";
    const first = trendData.years[0].rank;
    const last = trendData.years[trendData.years.length - 1].rank;

    if (first === 0 || last === 0) return "Incomplete trend data";

    const diff = last - first;
    const percent = Math.abs((diff / first) * 100).toFixed(1);

    if (diff < -150) {
      return `Competitive index has significantly INCREASED. The cutoff rank fell by ${percent}% from 2022 to 2025, meaning seats are filling much faster in recent years. Aim for a better rank to secure a seat here!`;
    } else if (diff > 150) {
      return `Admissions threshold has slightly EXPANDED. The cutoff rank increased by ${percent}% from 2022 to 2025, which makes admission relatively easier compared to prior sessions.`;
    } else {
      return `Cutoffs remain highly stable. Fluctuations are minimal (less than 4%), making 2025 data an exceptionally strong predictor for your 2026 reference.`;
    }
  }, [trendData]);

  // Handle Share link copy
  const handleShareLink = () => {
    const shareText = `I predicted my AP EAMCET colleges using EamcetAdvisor! Check your rank predictions instantly: ${window.location.origin}`;
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* PHASE 1 TOP NOTICE BANNER */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white text-xs sm:text-sm py-2.5 px-4 text-center font-medium shadow-inner flex items-center justify-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-400 text-slate-900 uppercase tracking-wider animate-pulse">
          Phase 1 Notice
        </span>
        <span>
          AP EAMCET 2026 counselling cutoffs are not yet released. Showing verified <strong>2025 cutoff statistics</strong> as your optimal reference.
        </span>
      </div>

      {/* HEADER / NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
                  Eamcet<span className="text-blue-600">Advisor</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                  AP
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">
                2026 Academic Predictor Portal
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("predictor")}
              className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === "predictor"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Predictor
            </button>
            <button
              onClick={() => setActiveTab("trends")}
              className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === "trends"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Cutoff Trends
            </button>
            <button
              onClick={() => setActiveTab("explorer")}
              className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === "explorer"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Explore Colleges
            </button>
          </nav>
        </div>
      </header>

      {/* CORE WRAPPER */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* GLOBAL STREAM SELECTOR BANNER */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5 shadow-sm hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <SlidersHorizontal className="w-4.5 h-4.5 text-blue-600" />
              AP EAPCET (EAMCET) Counselling Stream
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Select your academic stream to automatically configure the predictor, participating colleges, and historical trends.
            </p>
          </div>
          <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl w-fit shrink-0 border border-slate-200/40">
            <button
              onClick={() => {
                setStream("MPC");
                setBranch("ALL");
                // Reset trend values to MPC default
                setTrendCollegeId("1"); // AUCE
                setTrendBranchCode("CSE");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                stream === "MPC"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              MPC (Engineering)
            </button>
            <button
              onClick={() => {
                setStream("BIPC");
                setBranch("ALL");
                // Reset trend values to BIPC default
                setTrendCollegeId("101"); // ANGRAU
                setTrendBranchCode("CAB");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                stream === "BIPC"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              BiPC (Agri & Pharmacy)
            </button>
          </div>
        </div>
        
        {/* PREDICTOR VIEW */}
        {activeTab === "predictor" && (
          <div className="space-y-10">
            
            {/* HERO INTRODUCTION */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Predict Your <span className="text-blue-600">AP EAMCET</span> College Admissions
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-medium">
                Enter your expected or official rank and categories to immediately map safe, borderline, and tough choices based on previous audited AP state counseling data.
              </p>
              
              {/* Quick stats banner representing actual EAMCET scale */}
                {/* Quick stats banner */}
<div className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 bg-blue-50/50 border border-blue-100/60 rounded-2xl py-3 px-6 text-sm text-slate-700 font-medium mt-4">

  <div className="flex items-center gap-2">
    <Building2 className="w-4 h-4 text-blue-600" />
    <span>600+ Participating Colleges</span>
  </div>

  <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

  <div className="flex items-center gap-2">
    <Award className="w-4 h-4 text-blue-600" />
    <span>1.5 Lakh+ Combined Seats</span>
  </div>

  <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

  <div className="flex items-center gap-2">
    <TrendingUp className="w-4 h-4 text-blue-600" />
    <span>MPC & BiPC Streams</span>
  </div>

</div>

{/* Live Usage Statistics */}
<div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
  <div className="text-center mb-4">
    <h3 className="text-lg font-extrabold text-slate-900">
      📊 Trusted by AP EAMCET Students
    </h3>
    <p className="text-sm text-slate-500">
      Live statistics updated in real time
    </p>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div className="bg-blue-50 rounded-xl p-4 text-center">
      <div className="text-3xl font-extrabold text-blue-600">
        {predictionCount.toLocaleString()}
      </div>
      <div className="text-sm font-semibold text-slate-600 mt-1">
        🎯 Predictions Generated
      </div>
    </div>

    <div className="bg-green-50 rounded-xl p-4 text-center">
      <div className="text-3xl font-extrabold text-green-600">
        {pdfDownloadCount.toLocaleString()}
      </div>
      <div className="text-sm font-semibold text-slate-600 mt-1">
        📄 PDFs Downloaded
      </div>
    </div>
  </div>
</div>
      </div>

            {/* PREDICTOR FORM & USER ENTRY GRID */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-100/50 overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <SlidersHorizontal className="w-4.5 h-4.5 stroke-[2]" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Configure Your Prediction Profile</h2>
                </div>
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1">
                  AP EAPCET 2026 Reference
                </span>
              </div>

              <form onSubmit={handlePredict} className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                
                {/* Error Banner */}
                {formError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                  
                  {/* Rank Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-800" htmlFor="rank">
                      Enter Your Rank <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="rank"
                        placeholder="e.g. 5200"
                        value={rankInput}
                        onChange={(e) => setRankInput(e.target.value)}
                        className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-lg transition-all"
                        required
                        min="1"
                        max="200000"
                      />
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                        RANK
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Provide your actual or estimated general rank.</p>
                  </div>

                  {/* Category Select */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-800" htmlFor="category">
                      Reservation Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-700 transition-all bg-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">Select your counselling group category.</p>
                  </div>

                  {/* Gender Select */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-800" htmlFor="gender">
                      Candidate Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-700 transition-all bg-white"
                    >
                      {GENDERS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">Includes Special Reservation seats for girls.</p>
                  </div>
                </div>

                {/* ADVANCED OPTIONAL FILTERS */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Optional Preference Filters (Narrow Search)
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    
                    {/* Branch Preference */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700" htmlFor="branch-filter">
                        Preferred Branch
                      </label>
                      <select
                        id="branch-filter"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        {BRANCHES.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* District Preference */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700" htmlFor="district-filter">
                        College District
                      </label>
                      <select
                        id="district-filter"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        {DISTRICTS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Region Filter */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700" htmlFor="region-filter">
                        Local University Region
                      </label>
                      <select
                        id="region-filter"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        {REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* College Type Filter */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700" htmlFor="type-filter">
                        College Type
                      </label>
                      <select
                        id="type-filter"
                        value={collegeType}
                        onChange={(e) => setCollegeType(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                      >
                        <option value="ALL">All College Types</option>
                        <option value="Govt">Government / University Colleges</option>
                        <option value="Private">Private Self-Financed Colleges</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submission Actions */}
                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto px-6 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    Clear Values
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-md shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Predict My Colleges
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            </div>

            {/* PREDICTOR RESULTS AREA */}
            {hasPredicted && (
              <div id="predictions-results" className="space-y-8 scroll-mt-24">
                
                {/* SECTION DIVIDER & TITLE */}
                <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Predicted Admission Options
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Based on EAMCET rank <span className="font-bold text-blue-600">{parseInt(rankInput).toLocaleString()}</span> • Category <span className="font-bold text-blue-600">{category}</span> • Gender <span className="font-bold text-blue-600">{gender}</span>
                    </p>
                  </div>
                  
                  {/* Share Report & Download Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleShareLink}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {copiedLink ? "Link Copied!" : "Share Results"}
                    </button>
                    
                    <button
                      onClick={() => handleDownloadPDF(false)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF Report
                    </button>
                  </div>
                </div>

                {/* 1. SUMMARY STAT CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Total Options Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matched Options</p>
                      <h3 className="text-2xl font-extrabold text-slate-900">{metrics.total}</h3>
                    </div>
                  </div>

                  {/* Safe Choices Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Safe Options</p>
                      <h3 className="text-2xl font-extrabold text-emerald-600">{metrics.safe}</h3>
                    </div>
                  </div>

                  {/* Borderline Choices Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                      <Info className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Borderline</p>
                      <h3 className="text-2xl font-extrabold text-amber-600">{metrics.borderline}</h3>
                    </div>
                  </div>

                  {/* Difficult Choices Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Difficult</p>
                      <h3 className="text-2xl font-extrabold text-red-600">{metrics.difficult}</h3>
                    </div>
                  </div>
                </div>

                {/* 2. LOCAL SEARCH & SORT/FILTER DASHBOARD */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Search inside predicted */}
                  <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search within predicted colleges or branches..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Sort Controls & Shortlist Toggle */}
                  <div className="flex flex-wrap items-center gap-4">
                    
                    {/* Bookmarked/Shortlisted filter checkbox */}
                    <button
                      onClick={() => setShowShortlistedOnly(!showShortlistedOnly)}
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all ${
                        showShortlistedOnly
                          ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Heart className={`w-4.5 h-4.5 ${showShortlistedOnly ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                      Shortlisted Only ({shortlistedKeys.size})
                    </button>

                    {/* Shortlist PDF download */}
                    {showShortlistedOnly && shortlistedKeys.size > 0 && (
                      <button
                        onClick={() => handleDownloadPDF(true)}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF Shortlist
                      </button>
                    )}

                    <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

                    {/* Admission Chance Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Chance:</span>
                      <select
                        value={chanceFilter}
                        onChange={(e) => setChanceFilter(e.target.value)}
                        className="text-xs font-bold text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none bg-white cursor-pointer"
                      >
                        <option value="RECOMMENDED">Safe & Borderline (Recommended)</option>
                        <option value="SAFE">Safe Only (Highly Likely)</option>
                        <option value="ALL">All Options (Include Difficult)</option>
                      </select>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-bold">Sort By:</span>
                      <select
                        value={sortKey}
                        onChange={(e: any) => setSortKey(e.target.value)}
                        className="text-xs font-bold text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none bg-white"
                      >
                        <option value="rank">Cutoff (Ascending)</option>
                        <option value="chance">Admission Chance</option>
                        <option value="name">College Name (A-Z)</option>
                      </select>

                      <button
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        title="Toggle Sort Order"
                        className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. DETAILED RESULTS DISPLAY */}
                {displayPredictions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto stroke-[1.5]" />
                    <h3 className="text-lg font-bold text-slate-900">No Admission Matches Found</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {chanceFilter !== "ALL"
                        ? "No safe or borderline colleges match this rank. Try including competitive options to see higher threshold colleges."
                        : "Try entering a larger rank, choosing another reservation category, or removing preference filters to expand options."}
                    </p>
                    {chanceFilter !== "ALL" && (
                      <button
                        onClick={() => setChanceFilter("ALL")}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-100 cursor-pointer"
                      >
                        Show All Options (Including Difficult)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {displayPredictions.map((opt) => {
                      const isShortlisted = shortlistedKeys.has(`${opt.college.code}-${opt.branch.code}`);
                      const isTopPick = `${opt.college.code}-${opt.branch.code}` === topPickKey;
                      const studentRankNum = parseInt(rankInput) || 0;

                      // Safety Margin Calculation
                      const diff = opt.cutoff2025 - studentRankNum;
                      const safetyPercent = Math.max(0, Math.min(100, (diff / opt.cutoff2025) * 100));

                      return (
                        <div
                          key={`${opt.college.code}-${opt.branch.code}`}
                          className={`bg-white rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between p-6 gap-6 ${
                            isTopPick
                              ? "border-blue-500 ring-2 ring-blue-500/10 shadow-md"
                              : "border-slate-200 hover:border-slate-300 shadow-sm"
                          }`}
                        >
                          {/* Top Pick Ribbon */}
                          {isTopPick && (
                            <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-bold px-3.5 py-1 rounded-br-xl shadow-sm uppercase tracking-wider flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 fill-white/20" />
                              Best Match (Top Pick)
                            </div>
                          )}

                          {/* Left Block: College, Branch, Location */}
                          <div className="space-y-3 md:max-w-[45%] flex-grow pt-4 md:pt-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                                {opt.college.code}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                {opt.college.type}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100">
                                NAAC {opt.college.naac}
                              </span>
                            </div>

                            <button
                              onClick={() => setSelectedCollege(opt.college)}
                              className="text-left font-extrabold text-base sm:text-lg text-slate-900 hover:text-blue-600 transition-colors group block leading-snug"
                            >
                              {opt.college.name}
                              <ExternalLink className="w-3.5 h-3.5 inline-block ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {opt.college.district} ({opt.college.region} Region)
                              </span>
                              <span className="h-3 w-[1px] bg-slate-200"></span>
                              <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                Estd: {opt.college.estd}
                              </span>
                            </div>

                            {/* Branch details */}
                            <div className="mt-2 bg-slate-50 border border-slate-100/70 p-3 rounded-xl flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-700 font-extrabold text-xs">
                                {opt.branch.code}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 leading-none">{opt.branch.name}</h4>
                                <span className="text-[10px] text-slate-500 font-semibold mt-1 inline-block">AP EAMCET Course ID: {opt.branch.code}</span>
                              </div>
                            </div>
                          </div>

                          {/* Middle Block: Safety Margin & Cutoff */}
                          <div className="md:w-[35%] flex-grow flex flex-col justify-center space-y-3">
                            
                            {/* Cutoff Values Grid */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                                  Your Rank
                                </span>
                                <span className="text-base font-extrabold text-slate-800">
                                  {studentRankNum.toLocaleString()}
                                </span>
                              </div>
                              <div className="bg-blue-50/20 p-2.5 rounded-xl border border-blue-100/30 text-center">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide block">
                                  2025 Cutoff
                                </span>
                                <span className="text-base font-extrabold text-blue-700">
                                  {opt.cutoff2025.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* PROGRESS BAR TRACK */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[11px] font-bold">
                                <span className="text-slate-500">Admissions Position</span>
                                {opt.chance === "Safe" ? (
                                  <span className="text-emerald-600">
                                    +{diff.toLocaleString()} ranks safe margin ({safetyPercent.toFixed(0)}%)
                                  </span>
                                ) : opt.chance === "Borderline" ? (
                                  <span className="text-amber-600">
                                    {Math.abs(diff).toLocaleString()} ranks over cutoff
                                  </span>
                                ) : (
                                  <span className="text-red-500">
                                    {Math.abs(diff).toLocaleString()} ranks over cutoff
                                  </span>
                                )}
                              </div>
                              
                              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-100">
                                {opt.chance === "Safe" ? (
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${safetyPercent}%` }}
                                  ></div>
                                ) : opt.chance === "Borderline" ? (
                                  <div className="h-full bg-amber-500 rounded-full w-[85%]"></div>
                                ) : (
                                  <div className="h-full bg-red-500 rounded-full w-[30%]"></div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Block: Badges & Shortlist Toggle */}
                          <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:items-end gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                            
                            {/* Chance badge */}
                            <div className="text-left md:text-right">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                                Admission Chance
                              </span>
                              {opt.chance === "Safe" ? (
                                <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Highly Safe Match
                                </span>
                              ) : opt.chance === "Borderline" ? (
                                <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Info className="w-3.5 h-3.5" />
                                  Borderline Chance
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Difficult Target
                                </span>
                              )}
                            </div>

                            {/* Shortlist ❤️ button */}
                            <button
                              onClick={() => toggleShortlist(opt.college.code, opt.branch.code)}
                              className={`p-2.5 rounded-xl border transition-all ${
                                isShortlisted
                                  ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                                  : "bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-slate-50"
                              }`}
                              title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                            >
                              <Heart className={`w-5 h-5 ${isShortlisted ? "fill-rose-500 text-rose-500" : ""}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ADMISSIONS COUNSELLING GUIDELINE INFOGRAPHICS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-950">How EamcetAdvisor Calculations Work</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Highly Safe Matches</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Occur when your general rank is **smaller (better)** than the historic 2025 cutoff rank. This indicates an extremely high probability of secure admission.
                  </p>
                </div>

                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Borderline Matches</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Indicate your rank is slightly beyond the cutoff (up to 20% higher). Since annual cutoffs fluctuate with applicant counts, these choices are worth placing in your top-option web counseling forms.
                  </p>
                </div>

                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Difficult Targets</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Represent institutions where your rank exceeds the cutoff by more than 20%. Admission is unlikely unless seat allocations are significantly expanded.
                  </p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-4 text-xs text-amber-800 space-y-1">
                <p className="font-bold">⚠️ Legal Cutoff Disclaimer Notice:</p>
                <p className="leading-relaxed font-medium">
                  All predictive indices displayed on EamcetAdvisor represent helpful preference guides calculated against official AP State Council of Higher Education (APSCHE) 2025 web counseling records. Actual admission cutoffs fluctuate annually based on candidate performance, reservation distributions, seat structures, and student priority trends.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* HISTORICAL TRENDS VIEW */}
        {activeTab === "trends" && (
          <div className="space-y-8">
            
            {/* Header description */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Analyze Cutoff Trends (2022 - 2025)
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                Track how closing ranks for major colleges have fluctuated. Compare categories and genders to plan a competitive counselling preference form.
              </p>
            </div>

            {/* SELECTION CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                
                {/* Select College */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800" htmlFor="trend-college">
                    Select College
                  </label>
                  <select
                    id="trend-college"
                    value={trendCollegeId}
                    onChange={(e) => {
                      setTrendCollegeId(e.target.value);
                      // Default to first branch code
                      const col = COLLEGES.find((c) => c.id === e.target.value);
                      if (col && col.branches.length > 0) {
                        setTrendBranchCode(col.branches[0].code);
                      }
                    }}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                  >
                    {COLLEGES.filter((c) => c.branches.some((b) => b.stream === stream)).map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Branch */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800" htmlFor="trend-branch">
                    Select Course / Branch
                  </label>
                  <select
                    id="trend-branch"
                    value={trendBranchCode}
                    onChange={(e) => setTrendBranchCode(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                  >
                    {COLLEGES.find((c) => c.id === trendCollegeId)?.branches.filter((b) => b.stream === stream).map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reservation Category */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800" htmlFor="trend-cat">
                    Category
                  </label>
                  <select
                    id="trend-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Candidate Gender */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800" htmlFor="trend-gender">
                    Gender Quota
                  </label>
                  <select
                    id="trend-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white"
                  >
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* VISUAL TREND CHART & DESCRIPTION */}
              {trendData ? (
                <div className="pt-6 border-t border-slate-100 space-y-8">
                  
                  {/* Trend Metadata Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">
                        {trendData.college.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold mt-1">
                        Branch: <span className="text-blue-600">{trendData.branch.name} ({trendData.branch.code})</span> • Group: <span className="text-blue-600">{category} ({gender})</span>
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 bg-white border border-slate-200 rounded-xl py-2 px-4 shadow-sm text-xs font-bold text-slate-700">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      4 Years Verified Cutoffs
                    </div>
                  </div>

                  {/* CUSTOM CORRESPONDING HISTORICAL COLUMNS VISUALIZATION */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                      {trendData.years.map((yItem) => {
                        // Max cutoff across the trend years to scale height
                        const maxRank = Math.max(...trendData.years.map((y) => y.rank), 5000);
                        // Scale height as percentage (max rank corresponds to height 100%)
                        // We do 20% min height to make sure even small ranks are clearly visible
                        const barHeight = Math.max(15, Math.min(100, (yItem.rank / maxRank) * 100));

                        return (
                          <div
                            key={yItem.year}
                            className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 flex flex-col items-center space-y-4 hover:border-blue-200 hover:bg-white transition-all group"
                          >
                            <span className="text-xs font-extrabold text-slate-400 group-hover:text-blue-600 transition-colors">
                              Session {yItem.year}
                            </span>
                            
                            {/* Graphic Bar Track */}
                            <div className="w-full h-36 bg-slate-100 rounded-lg flex items-end justify-center p-2 border border-slate-100 relative">
                              <div
                                className="w-10 rounded bg-gradient-to-t from-blue-700 to-blue-500 transition-all duration-700 ease-out shadow-sm group-hover:from-blue-600 group-hover:to-indigo-500"
                                style={{ height: `${barHeight}%` }}
                              ></div>
                            </div>

                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                Closing Cutoff
                              </span>
                              <span className="text-lg font-extrabold text-slate-800">
                                {yItem.rank.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DYNAMIC TREND INSIGHT CARD */}
                    <div className="bg-blue-50/50 border border-blue-100/60 rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-extrabold text-blue-950">EamcetAdvisor Trend Insight</h4>
                        <p className="text-xs leading-relaxed text-slate-600 font-medium">
                          {trendAnalysis}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed pt-1">
                          📌 Note: Cutoff closing rank reflects the final admitted rank for a category. A smaller closing rank indicates higher competitiveness, while a larger closing rank indicates a lower score threshold.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No verified trend metrics found for this selection.
                </div>
              )}
            </div>

          </div>
        )}

        {/* COLLEGE EXPLORER TAB VIEW */}
        {activeTab === "explorer" && (
          <div className="space-y-8">
            
            {/* Header info */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                AP EAMCET College Directory
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                Browse official participating colleges in AP EAMCET counselling, explore NAAC rankings, intake capacities, and review specific branches offered.
              </p>
            </div>

            {/* COLLEGE DIRECTORY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {COLLEGES.filter((c) => c.branches.some((b) => b.stream === stream)).map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        CODE: {c.code}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {c.type}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-950 group-hover:text-blue-600 transition-colors">
                      {c.name}
                    </h3>

                    <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {c.district} ({c.region} Region)
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        NAAC Accreditation: <span className="font-bold text-slate-700">{c.naac}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Total Intake: <span className="font-bold text-slate-700">{c.seats} seats</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                        Branches Available
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {c.branches.filter((b) => b.stream === stream).map((b) => (
                          <span
                            key={b.code}
                            title={b.name}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                          >
                            {b.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Official Site
                    </a>
                    <button
                      onClick={() => setSelectedCollege(c)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Brand footer */}
            <div className="space-y-2 text-center md:text-left">
              <span className="font-extrabold text-lg text-slate-900">
                Eamcet<span className="text-blue-600">Advisor</span>
              </span>
              <p className="text-xs text-slate-500 max-w-sm">
                Dedicated counseling preference portal to map safe options and cutoffs for Andhra Pradesh state engineering admissions.
              </p>
            </div>

            {/* Quick footer links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-bold uppercase tracking-wider">
              <button onClick={() => setActiveTab("predictor")} className="hover:text-blue-600 transition-colors">
                Admission Predictor
              </button>
              <button onClick={() => setActiveTab("trends")} className="hover:text-blue-600 transition-colors">
                Historical Trends
              </button>
              <button onClick={() => setActiveTab("explorer")} className="hover:text-blue-600 transition-colors">
                Participating Colleges
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} EamcetAdvisor AP Predictor. All rights reserved.</p>
            <p>Made with absolute integrity for AP state engineering candidates.</p>
          </div>
        </div>
      </footer>

      {/* DETAILED COLLEGE POPUP MODAL */}
      {selectedCollege && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full shadow-2xl relative overflow-hidden my-8">
            
            {/* Modal Header bar */}
            <div className="bg-gradient-to-tr from-blue-900 to-indigo-950 p-6 text-white relative">
              <button
                onClick={() => setSelectedCollege(null)}
                className="absolute top-4 right-4 p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded">
                    CODE: {selectedCollege.code}
                  </span>
                  <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded">
                    {selectedCollege.type} College
                  </span>
                  <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                    NAAC {selectedCollege.naac}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  {selectedCollege.name}
                </h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Core stats parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Established</span>
                  <span className="text-sm font-extrabold text-slate-800">{selectedCollege.estd}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Region</span>
                  <span className="text-sm font-extrabold text-slate-800">{selectedCollege.region}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">District</span>
                  <span className="text-sm font-extrabold text-slate-800">{selectedCollege.district}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Intake</span>
                  <span className="text-sm font-extrabold text-slate-800">{selectedCollege.seats} seats</span>
                </div>
              </div>

              {/* Verified Cutoff lists */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Verified branch cutoff ranks (2025 Session)
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {selectedCollege.branches.map((b) => {
                    const cutoffsCat = b.cutoffs[category];
                    const cutoffsGend = cutoffsCat ? cutoffsCat[gender] : null;
                    const val = cutoffsGend ? cutoffsGend[2025] : 0;

                    return (
                      <div key={b.code} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="text-xs font-bold text-blue-600 block">{b.code}</span>
                          <span className="text-xs font-medium text-slate-800">{b.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Closing Rank
                          </span>
                          <span className="text-sm font-extrabold text-slate-800">
                            {val > 0 ? val.toLocaleString() : "N/A"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Web link */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">
                  Use EamcetAdvisor code <strong className="text-slate-800">{selectedCollege.code}</strong> for AP counseling forms.
                </p>
                <a
                  href={selectedCollege.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Visit Web
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
