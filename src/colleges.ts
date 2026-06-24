export interface CutoffsMap {
  [year: number]: number;
}

export interface GenderCutoffs {
  [gender: string]: CutoffsMap; // "Co-Ed" or "Girls"
}

export interface CategoryCutoffs {
  [category: string]: GenderCutoffs; // "OC", "BC_A", "BC_B", "BC_D", "BC_E", "SC", "ST", etc.
}

export interface BranchData {
  code: string; // e.g. "CSE", "CAB", "PHR"
  name: string; // e.g. "Computer Science & Engineering", "B.Sc. Agriculture"
  stream: "MPC" | "BIPC";
  cutoffs: CategoryCutoffs;
}

export interface College {
  id: string;
  code: string; // TSEA/APEAMCET code, e.g. "AUCE"
  name: string;
  estd: number;
  naac: string;
  type: "Govt" | "Private";
  region: "AU" | "SVU";
  district: string;
  website: string;
  seats: number;
  branches: BranchData[];
}

export const STREAMS = [
  { value: "MPC", label: "MPC Stream (Engineering & Technology)" },
  { value: "BIPC", label: "BiPC Stream (Agriculture, Pharmacy & Bio-Tech)" },
];

export const CATEGORIES = [
  { value: "OC", label: "OC (Open Category)" },
  { value: "BC_A", label: "BC-A" },
  { value: "BC_B", label: "BC-B" },
  { value: "BC_D", label: "BC-D" },
  { value: "BC_E", label: "BC-E" },
  { value: "SC", label: "SC" },
  { value: "ST", label: "ST" },
];

export const GENDERS = [
  { value: "Co-Ed", label: "General / Co-Education" },
  { value: "Girls", label: "Girls Quota Only" },
];

export const MPC_BRANCHES = [
  { value: "ALL", label: "All Engineering Branches" },
  { value: "CSE", label: "Computer Science & Engineering (CSE)" },
  { value: "ECE", label: "Electronics & Communication Engineering (ECE)" },
  { value: "ADS", label: "Artificial Intelligence & Data Science (AIDS)" },
  { value: "AML", label: "AI & Machine Learning (AIML)" },
  { value: "INF", label: "Information Technology (IT)" },
  { value: "EEE", label: "Electrical & Electronics Engineering (EEE)" },
  { value: "ME", label: "Mechanical Engineering (ME)" },
  { value: "CE", label: "Civil Engineering (CE)" },
  { value: "BIO", label: "B.Tech Bio-Technology (BIO)" },
  { value: "CHE", label: "Chemical Engineering (CHE)" },
];

export const BIPC_BRANCHES = [
  { value: "ALL", label: "All Agri & Pharmacy Branches" },
  { value: "CAB", label: "B.Sc. (Hons) Agriculture (CAB)" },
  { value: "HORT", label: "B.Sc. (Hons) Horticulture (HORT)" },
  { value: "PHR", label: "B.Pharmacy (PHR)" },
  { value: "PHD", label: "Pharm.D (Doctor of Pharmacy)" },
  { value: "BIO_B", label: "B.Tech Bio-Technology (BiPC)" },
  { value: "FDT_B", label: "B.Tech Food Technology (BiPC)" },
  { value: "FIS", label: "Bachelor of Fisheries Science (B.F.Sc)" },
];

export const DISTRICTS = [
  { value: "ALL", label: "All Districts" },
  { value: "Visakhapatnam", label: "Visakhapatnam" },
  { value: "Krishna", label: "Krishna (Vijayawada)" },
  { value: "Guntur", label: "Guntur" },
  { value: "Chittoor", label: "Chittoor (Tirupati)" },
  { value: "East Godavari", label: "East Godavari (Kakinada)" },
  { value: "West Godavari", label: "West Godavari (Bhimavaram)" },
  { value: "Kurnool", label: "Kurnool" },
  { value: "Anantapur", label: "Anantapur" },
  { value: "Vizianagaram", label: "Vizianagaram" },
  { value: "Nellore", label: "SPSR Nellore" },
  { value: "Prakasam", label: "Prakasam (Ongole)" },
  { value: "Kadapa", label: "YSR Kadapa" },
];

export const REGIONS = [
  { value: "ALL", label: "All Regions (AU & SVU)" },
  { value: "AU", label: "Andhra University (AU) Region" },
  { value: "SVU", label: "Sri Venkateswara University (SVU) Region" },
];

// Helper to generate realistic trend cutoffs
// baseCutoff is the cutoff rank in 2025. It generates previous years 2022, 2023, 2024.
function makeCutoffs(baseCutoff: number, categoryMultiplier = 1.0, genderMultiplier = 1.0): CategoryCutoffs {
  const categories = ["OC", "BC_A", "BC_B", "BC_D", "BC_E", "SC", "ST"];
  const result: any = {};

  categories.forEach((cat) => {
    let catMult = 1.0;
    if (cat === "BC_A") catMult = 1.45;
    else if (cat === "BC_B") catMult = 1.38;
    else if (cat === "BC_D") catMult = 1.32;
    else if (cat === "BC_E") catMult = 1.65;
    else if (cat === "SC") catMult = 2.95;
    else if (cat === "ST") catMult = 4.45;

    const catBase = baseCutoff * catMult * categoryMultiplier;

    result[cat] = {
      "Co-Ed": {
        2022: Math.max(100, Math.round(catBase * 0.93)),
        2023: Math.max(100, Math.round(catBase * 0.96)),
        2024: Math.max(100, Math.round(catBase * 1.02)),
        2025: Math.max(100, Math.round(catBase)),
      },
      "Girls": {
        2022: Math.max(100, Math.round(catBase * 1.08 * genderMultiplier)),
        2023: Math.max(100, Math.round(catBase * 1.11 * genderMultiplier)),
        2024: Math.max(100, Math.round(catBase * 1.18 * genderMultiplier)),
        2025: Math.max(100, Math.round(catBase * 1.14 * genderMultiplier)),
      },
    };
  });

  return result;
}

// Prestigious core static colleges
const STATIC_COLLEGES: College[] = [
  // ==================== MPC ENGINEERING COLLEGES ====================
  {
    id: "1",
    code: "AUCE",
    name: "Andhra University College of Engineering, Visakhapatnam",
    estd: 1946,
    naac: "A++",
    type: "Govt",
    region: "AU",
    district: "Visakhapatnam",
    website: "https://www.andhrauniversity.edu.in",
    seats: 540,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(1200) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(2400) },
      { code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(1800) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(4800) },
      { code: "ME", name: "Mechanical Engineering", stream: "MPC", cutoffs: makeCutoffs(8200) },
      { code: "CE", name: "Civil Engineering", stream: "MPC", cutoffs: makeCutoffs(11000) },
      { code: "CHE", name: "Chemical Engineering", stream: "MPC", cutoffs: makeCutoffs(12500) },
      { code: "BIO", name: "B.Tech Bio-Technology", stream: "MPC", cutoffs: makeCutoffs(9800) },
    ],
  },
  {
    id: "2",
    code: "JNKK",
    name: "JNTUK College of Engineering, Kakinada",
    estd: 1946,
    naac: "A+",
    type: "Govt",
    region: "AU",
    district: "East Godavari",
    website: "https://jntukucek.ac.in",
    seats: 480,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(1450) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(2900) },
      { code: "AML", name: "AI & Machine Learning", stream: "MPC", cutoffs: makeCutoffs(2100) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(5500) },
      { code: "ME", name: "Mechanical Engineering", stream: "MPC", cutoffs: makeCutoffs(9100) },
      { code: "CE", name: "Civil Engineering", stream: "MPC", cutoffs: makeCutoffs(12500) },
    ],
  },
  {
    id: "3",
    code: "SVUC",
    name: "Sri Venkateswara University College of Engineering, Tirupati",
    estd: 1959,
    naac: "A+",
    type: "Govt",
    region: "SVU",
    district: "Chittoor",
    website: "https://www.svuce.edu.in",
    seats: 420,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(1600) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(3200) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(6200) },
      { code: "ME", name: "Mechanical Engineering", stream: "MPC", cutoffs: makeCutoffs(10500) },
      { code: "CE", name: "Civil Engineering", stream: "MPC", cutoffs: makeCutoffs(14000) },
    ],
  },
  {
    id: "4",
    code: "JNTA",
    name: "JNTUA College of Engineering, Anantapur",
    estd: 1946,
    naac: "A",
    type: "Govt",
    region: "SVU",
    district: "Anantapur",
    website: "https://www.jntuaceam.ac.in",
    seats: 460,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(2200) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(4100) },
      { code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(3100) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(8400) },
      { code: "ME", name: "Mechanical Engineering", stream: "MPC", cutoffs: makeCutoffs(13000) },
    ],
  },
  {
    id: "5",
    code: "GVPV",
    name: "Gayatri Vidya Parishad College of Engineering, Visakhapatnam",
    estd: 1996,
    naac: "A",
    type: "Private",
    region: "AU",
    district: "Visakhapatnam",
    website: "http://www.gvpce.ac.in",
    seats: 900,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(2800) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(5800) },
      { code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(4000) },
      { code: "AML", name: "AI & Machine Learning", stream: "MPC", cutoffs: makeCutoffs(4200) },
      { code: "INF", name: "Information Technology", stream: "MPC", cutoffs: makeCutoffs(5100) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(12000) },
      { code: "ME", name: "Mechanical Engineering", stream: "MPC", cutoffs: makeCutoffs(19000) },
    ],
  },
  {
    id: "6",
    code: "VRSE",
    name: "Velagapudi Ramakrishna Siddhartha Engineering College, Vijayawada",
    estd: 1977,
    naac: "A+",
    type: "Private",
    region: "AU",
    district: "Krishna",
    website: "https://www.vrsiddhartha.ac.in",
    seats: 960,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(2500) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(5400) },
      { code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(3800) },
      { code: "INF", name: "Information Technology", stream: "MPC", cutoffs: makeCutoffs(4700) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(11500) },
      { code: "ME", name: "Mechanical Engineering", stream: "MPC", cutoffs: makeCutoffs(18500) },
    ],
  },
  {
    id: "7",
    code: "RVRJ",
    name: "RVR & JC College of Engineering, Guntur",
    estd: 1985,
    naac: "A+",
    type: "Private",
    region: "AU",
    district: "Guntur",
    website: "https://rvrjcce.ac.in",
    seats: 1020,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(3400) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(6800) },
      { code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(4800) },
      { code: "AML", name: "AI & Machine Learning", stream: "MPC", cutoffs: makeCutoffs(5100) },
      { code: "INF", name: "Information Technology", stream: "MPC", cutoffs: makeCutoffs(6200) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(14000) },
    ],
  },
  {
    id: "8",
    code: "SRKR",
    name: "SRKR Engineering College, Bhimavaram",
    estd: 1980,
    naac: "A",
    type: "Private",
    region: "AU",
    district: "West Godavari",
    website: "http://www.srkr.ac.in",
    seats: 960,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(3100) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(6200) },
      { code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(4400) },
      { code: "INF", name: "Information Technology", stream: "MPC", cutoffs: makeCutoffs(5500) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(13000) },
    ],
  },
  {
    id: "9",
    code: "SVEC",
    name: "Sree Vidyanikethan Engineering College, Tirupati",
    estd: 1996,
    naac: "A",
    type: "Private",
    region: "SVU",
    district: "Chittoor",
    website: "https://svec.education",
    seats: 1080,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(4100) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(7800) },
      { code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(5600) },
      { code: "INF", name: "Information Technology", stream: "MPC", cutoffs: makeCutoffs(7200) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(16000) },
    ],
  },
  {
    id: "10",
    code: "MITS",
    name: "Madanapalle Institute of Technology & Science, Madanapalle",
    estd: 1998,
    naac: "A+",
    type: "Private",
    region: "SVU",
    district: "Chittoor",
    website: "https://www.mits.ac.in",
    seats: 960,
    branches: [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(5800) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(11000) },
      { code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(7800) },
      { code: "AML", name: "AI & Machine Learning", stream: "MPC", cutoffs: makeCutoffs(8200) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(21000) },
    ],
  },

  // ==================== BIPC AGRICULTURE & PHARMACY COLLEGES ====================
  {
    id: "101",
    code: "ANGRAU",
    name: "Acharya N.G. Ranga Agricultural University (ANGRAU), Guntur",
    estd: 1964,
    naac: "A+",
    type: "Govt",
    region: "AU",
    district: "Guntur",
    website: "https://angrau.ac.in",
    seats: 600,
    branches: [
      { code: "CAB", name: "B.Sc. (Hons) Agriculture", stream: "BIPC", cutoffs: makeCutoffs(1800) },
      { code: "FDT_B", name: "B.Tech Food Technology", stream: "BIPC", cutoffs: makeCutoffs(4200) },
    ],
  },
  {
    id: "102",
    code: "ANGN",
    name: "Agricultural College (ANGRAU), Naira",
    estd: 1989,
    naac: "A",
    type: "Govt",
    region: "AU",
    district: "Vizianagaram",
    website: "https://angrau.ac.in",
    seats: 120,
    branches: [
      { code: "CAB", name: "B.Sc. (Hons) Agriculture", stream: "BIPC", cutoffs: makeCutoffs(3100) },
    ],
  },
  {
    id: "103",
    code: "ANGM",
    name: "Agricultural College (ANGRAU), Mahanandi",
    estd: 1991,
    naac: "A",
    type: "Govt",
    region: "SVU",
    district: "Kurnool",
    website: "https://angrau.ac.in",
    seats: 110,
    branches: [
      { code: "CAB", name: "B.Sc. (Hons) Agriculture", stream: "BIPC", cutoffs: makeCutoffs(3400) },
    ],
  },
  {
    id: "104",
    code: "YSRH",
    name: "Dr. Y.S.R. Horticultural University, Venkatramannagudem",
    estd: 2007,
    naac: "A",
    type: "Govt",
    region: "AU",
    district: "West Godavari",
    website: "https://drysrhu.ap.gov.in",
    seats: 250,
    branches: [
      { code: "HORT", name: "B.Sc. (Hons) Horticulture", stream: "BIPC", cutoffs: makeCutoffs(4500) },
    ],
  },
  {
    id: "105",
    code: "SVVU",
    name: "College of Fishery Science (SVVU), Muthukur",
    estd: 1991,
    naac: "A",
    type: "Govt",
    region: "SVU",
    district: "Nellore",
    website: "https://svvu.edu.in",
    seats: 80,
    branches: [
      { code: "FIS", name: "Bachelor of Fisheries Science (B.F.Sc)", stream: "BIPC", cutoffs: makeCutoffs(5100) },
    ],
  },
  {
    id: "106",
    code: "AUPH",
    name: "Andhra University College of Pharmaceutical Sciences, Visakhapatnam",
    estd: 1951,
    naac: "A++",
    type: "Govt",
    region: "AU",
    district: "Visakhapatnam",
    website: "https://andhrauniversity.edu.in",
    seats: 120,
    branches: [
      { code: "PHR", name: "B.Pharmacy", stream: "BIPC", cutoffs: makeCutoffs(2100) },
      { code: "PHD", name: "Pharm.D (Doctor of Pharmacy)", stream: "BIPC", cutoffs: makeCutoffs(1400) },
      { code: "BIO_B", name: "B.Tech Bio-Technology", stream: "BIPC", cutoffs: makeCutoffs(3500) },
    ],
  },
  {
    id: "107",
    code: "SVUP",
    name: "Sri Venkateswara University College of Pharmacy, Tirupati",
    estd: 1990,
    naac: "A+",
    type: "Govt",
    region: "SVU",
    district: "Chittoor",
    website: "https://svu.edu.in",
    seats: 100,
    branches: [
      { code: "PHR", name: "B.Pharmacy", stream: "BIPC", cutoffs: makeCutoffs(2600) },
      { code: "PHD", name: "Pharm.D (Doctor of Pharmacy)", stream: "BIPC", cutoffs: makeCutoffs(1800) },
    ],
  },
  {
    id: "108",
    code: "CHAL",
    name: "Chalapathi Institute of Pharmaceutical Sciences, Guntur",
    estd: 2004,
    naac: "A++",
    type: "Private",
    region: "AU",
    district: "Guntur",
    website: "https://www.chalapathiipharmacy.in",
    seats: 180,
    branches: [
      { code: "PHR", name: "B.Pharmacy", stream: "BIPC", cutoffs: makeCutoffs(4800) },
      { code: "PHD", name: "Pharm.D (Doctor of Pharmacy)", stream: "BIPC", cutoffs: makeCutoffs(3200) },
    ],
  },
  {
    id: "109",
    code: "RIPR",
    name: "Raghavendra Institute of Pharmaceutical Education & Research, Anantapur",
    estd: 2002,
    naac: "A+",
    type: "Private",
    region: "SVU",
    district: "Anantapur",
    website: "https://riper.ac.in",
    seats: 160,
    branches: [
      { code: "PHR", name: "B.Pharmacy", stream: "BIPC", cutoffs: makeCutoffs(5200) },
      { code: "PHD", name: "Pharm.D (Doctor of Pharmacy)", stream: "BIPC", cutoffs: makeCutoffs(3900) },
    ],
  },
  {
    id: "110",
    code: "SPMV",
    name: "Sri Padmavati Mahila Visvavidyalayam (Pharmacy), Tirupati",
    estd: 1983,
    naac: "A",
    type: "Govt",
    region: "SVU",
    district: "Chittoor",
    website: "https://spmvv.ac.in",
    seats: 120,
    branches: [
      // Female reservation university
      { code: "PHR", name: "B.Pharmacy", stream: "BIPC", cutoffs: makeCutoffs(3200) },
      { code: "PHD", name: "Pharm.D (Doctor of Pharmacy)", stream: "BIPC", cutoffs: makeCutoffs(2300) },
    ],
  },
];

// Helper variables for generating synthetic colleges
const DISTRICT_REGIONS = [
  { district: "Visakhapatnam", region: "AU" as const },
  { district: "Krishna", region: "AU" as const },
  { district: "Guntur", region: "AU" as const },
  { district: "Chittoor", region: "SVU" as const },
  { district: "East Godavari", region: "AU" as const },
  { district: "West Godavari", region: "AU" as const },
  { district: "Kurnool", region: "SVU" as const },
  { district: "Anantapur", region: "SVU" as const },
  { district: "Vizianagaram", region: "AU" as const },
  { district: "Nellore", region: "SVU" as const },
  { district: "Prakasam", region: "AU" as const },
  { district: "Kadapa", region: "SVU" as const },
];

const TRUSTS = [
  "Gayatri Vidya Parishad", "Sree Vidyanikethan", "Velagapudi Ramakrishna", "Siddhartha",
  "RVR & JC", "GMR Institute", "Anil Neerukonda", "Sir C.R. Reddy", "Vasireddy Venkatadri",
  "Aditya", "Pragati", "Raghu", "Srinivasa Ramanujan", "Annamacharya", "QIS", "Pace",
  "Lakireddy Bali Reddy", "Gudlavalleru", "NBKR", "PBR Visvodaya", "G. Pulla Reddy",
  "Santhiram", "Vemu", "Sree Rama", "Dadi", "Vignan's", "Sanketika", "Narayana",
  "Audisankara", "G Pullaiah", "Bapatla", "Lendi", "GMR Varalakshmi", "SRKR",
  "Chaitanya Bharathi", "Sree Vahini", "Ramachandra", "Eluru", "Gouthami", "KSRM",
  "Kandula Obul Reddy", "Pulla Reddy", "Sanskriti", "Mother Teresa", "SRK", "Newton",
  "Chaitanya", "Vikas", "Sadhana", "Andhra Loyola", "St. Johns", "Brindavan", "Global"
];

const PREFIXES = [
  "Sri", "Sri Sai", "Sri Venkateswara", "Sri Krishna", "Dr.", "Guru", "Viswanadha",
  "Satya", "Sai", "Geethanjali", "Adarsh", "Universal", "Kranthi", "Amrita"
];

const SUFFIXES = [
  "College of Engineering", "Institute of Technology & Science", "College of Engineering & Technology",
  "Institute of Science & Technology", "Institute of Technology", "Engineering College",
  "Institute of Engineering & Technology", "College of Engineering for Women"
];

// Helper to generate a unique 4-letter college code
function generateUniqueCode(index: number, isGovt: boolean, isBiPC: boolean, used: Set<string>): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const typeChar = isGovt ? "G" : (isBiPC ? "P" : "C");
  for (let attempt = 0; attempt < 1000; attempt++) {
    const c1 = letters[index % 26];
    const c2 = letters[(index * 7 + attempt) % 26];
    const c3 = letters[(index * 13 + attempt * 2) % 26];
    const code = `${typeChar}${c1}${c2}${c3}`;
    if (!used.has(code)) {
      used.add(code);
      return code;
    }
  }
  return `COL${index}`;
}

// Generate synthetic colleges programmatically to simulate the full counseling scale
function generateSyntheticColleges(): College[] {
  const generated: College[] = [];
  let idCounter = 200;

  // We have:
  // - 20 Static colleges (4 Govt MPC, 6 Private MPC, 8 Govt BiPC, 2 Private BiPC)
  // We want to generate:
  // - 21 Govt MPC Engineering Colleges (to total 25)
  // - 414 Private MPC Engineering Colleges (to total 420)
  // - 2 Govt BiPC Colleges (to total 10)
  // - 168 Private BiPC Colleges (to total 170)
  // Total colleges: ~625 colleges (600+ scale)
  // Total seats: ~1.5 lakh seats

  const usedCodes = new Set<string>([
    "AUCE", "JNKK", "SVUC", "JNTA", "GVPV", "VRSE", "RVRJ", "SRKR", "SVEC", "MITS",
    "ANGRAU", "ANGN", "ANGM", "YSRH", "SVVU", "AUPH", "SVUP", "CHAL", "RIPR", "SPMV"
  ]);

  // 1. Generate 21 Government MPC Engineering Colleges
  for (let i = 0; i < 21; i++) {
    const distInfo = DISTRICT_REGIONS[i % DISTRICT_REGIONS.length];
    const code = generateUniqueCode(i, true, false, usedCodes);
    const estd = 1960 + (i % 10) * 5;
    const baseRank = 2500 + i * 1100; // competitive ranks

    const branchesData: BranchData[] = [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank * 1.3) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank * 2.0) },
      { code: "ME", name: "Mechanical Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank * 2.8) },
      { code: "CE", name: "Civil Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank * 3.4) },
    ];

    if (i % 2 === 0) {
      branchesData.push({ code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(baseRank * 1.15) });
    }

    generated.push({
      id: (idCounter++).toString(),
      code,
      name: `Government College of Engineering, ${distInfo.district} (GCE${code})`,
      estd,
      naac: i % 3 === 0 ? "A+" : "A",
      type: "Govt",
      region: distInfo.region,
      district: distInfo.district,
      website: `http://gce${code.toLowerCase()}.ap.gov.in`,
      seats: 360 + (i % 3) * 60,
      branches: branchesData
    });
  }

  // 2. Generate 414 Private MPC Engineering Colleges
  for (let i = 0; i < 414; i++) {
    const distInfo = DISTRICT_REGIONS[i % DISTRICT_REGIONS.length];
    const code = generateUniqueCode(i, false, false, usedCodes);
    const trust = TRUSTS[i % TRUSTS.length];
    const prefix = i % 4 === 0 ? PREFIXES[(i * 3) % PREFIXES.length] : "";
    const suffix = SUFFIXES[(i * 7) % SUFFIXES.length];
    const fullName = `${prefix} ${trust} ${suffix}`.trim();
    const estd = 1995 + (i % 25);
    const baseRank = 8000 + (i * 132000) / 414; // Spread all ranks up to 140k

    const branchesData: BranchData[] = [
      { code: "CSE", name: "Computer Science & Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank) },
      { code: "ECE", name: "Electronics & Communication Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank * 1.4) },
      { code: "EEE", name: "Electrical & Electronics Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank * 2.1) },
      { code: "ME", name: "Mechanical Engineering", stream: "MPC", cutoffs: makeCutoffs(baseRank * 2.9) },
    ];

    if (i % 2 === 0) {
      branchesData.push({ code: "ADS", name: "Artificial Intelligence & Data Science", stream: "MPC", cutoffs: makeCutoffs(baseRank * 1.2) });
    }
    if (i % 3 === 0) {
      branchesData.push({ code: "AML", name: "AI & Machine Learning", stream: "MPC", cutoffs: makeCutoffs(baseRank * 1.25) });
      branchesData.push({ code: "INF", name: "Information Technology", stream: "MPC", cutoffs: makeCutoffs(baseRank * 1.3) });
    }

    generated.push({
      id: (idCounter++).toString(),
      code,
      name: `${fullName}, ${distInfo.district}`,
      estd,
      naac: i % 5 === 0 ? "A+" : (i % 3 === 0 ? "A" : "B++"),
      type: "Private",
      region: distInfo.region,
      district: distInfo.district,
      website: `http://www.${code.toLowerCase()}.edu`,
      seats: 300 + (i % 6) * 60,
      branches: branchesData
    });
  }

  // 3. Generate 2 Government BiPC Colleges
  for (let i = 0; i < 2; i++) {
    const distInfo = DISTRICT_REGIONS[(i + 5) % DISTRICT_REGIONS.length];
    const code = generateUniqueCode(i + 450, true, true, usedCodes);
    const estd = 1980 + i * 15;
    const baseRank = 3500 + i * 2000;

    generated.push({
      id: (idCounter++).toString(),
      code,
      name: `State Government Agricultural College, ${distInfo.district}`,
      estd,
      naac: "A",
      type: "Govt",
      region: distInfo.region,
      district: distInfo.district,
      website: `http://sgac${code.toLowerCase()}.ap.gov.in`,
      seats: 120,
      branches: [
        { code: "CAB", name: "B.Sc. (Hons) Agriculture", stream: "BIPC", cutoffs: makeCutoffs(baseRank) },
        { code: "HORT", name: "B.Sc. (Hons) Horticulture", stream: "BIPC", cutoffs: makeCutoffs(baseRank * 1.3) }
      ]
    });
  }

  // 4. Generate 168 Private BiPC Colleges
  for (let i = 0; i < 168; i++) {
    const distInfo = DISTRICT_REGIONS[i % DISTRICT_REGIONS.length];
    const code = generateUniqueCode(i + 500, false, true, usedCodes);
    const trust = TRUSTS[(i * 3) % TRUSTS.length];
    const prefix = PREFIXES[i % PREFIXES.length];
    const fullName = `${prefix} ${trust} College of Pharmacy`.trim();
    const estd = 2000 + (i % 20);
    const baseRank = 10000 + (i * 125000) / 168;

    const branchesData: BranchData[] = [];
    if (i % 2 === 0) {
      branchesData.push({ code: "PHR", name: "B.Pharmacy", stream: "BIPC", cutoffs: makeCutoffs(baseRank) });
      branchesData.push({ code: "PHD", name: "Pharm.D (Doctor of Pharmacy)", stream: "BIPC", cutoffs: makeCutoffs(baseRank * 0.75) });
    } else {
      branchesData.push({ code: "CAB", name: "B.Sc. (Hons) Agriculture", stream: "BIPC", cutoffs: makeCutoffs(baseRank) });
      branchesData.push({ code: "HORT", name: "B.Sc. (Hons) Horticulture", stream: "BIPC", cutoffs: makeCutoffs(baseRank * 1.3) });
      if (i % 4 === 0) {
        branchesData.push({ code: "FDT_B", name: "B.Tech Food Technology", stream: "BIPC", cutoffs: makeCutoffs(baseRank * 1.6) });
      }
    }

    generated.push({
      id: (idCounter++).toString(),
      code,
      name: `${fullName}, ${distInfo.district}`,
      estd,
      naac: i % 4 === 0 ? "A" : "B++",
      type: "Private",
      region: distInfo.region,
      district: distInfo.district,
      website: `http://www.${code.toLowerCase()}pharmacy.co.in`,
      seats: 120 + (i % 3) * 60,
      branches: branchesData
    });
  }

  return generated;
}

// Full combined participating college directory!
export const COLLEGES: College[] = [
  ...STATIC_COLLEGES,
  ...generateSyntheticColleges()
];
