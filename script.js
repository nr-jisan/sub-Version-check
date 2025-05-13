// DOM Elements
const olevelContainer = document.getElementById("olevelContainer");
const sscInput = document.getElementById("sscGpa");
const hscInput = document.getElementById("hscGpa");
const goldenContainer = document.getElementById("goldenContainer");
const goldenSsc = document.getElementById("goldenSsc");
const goldenHsc = document.getElementById("goldenHsc");
const diplomaCgpaInput = document.getElementById("diplomaCgpa");
const diplomaContainer = document.getElementById("diplomaContainer");
const admissionTypeSelect = document.getElementById("admissionType");
const departmentSelect = document.getElementById("department");
const form = document.getElementById("feeForm");
const resultSection = document.getElementById("result");
const resultCard = resultSection.querySelector(".result-card");


// Grade to Point Conversion
function gradeToPoint(grade) {
  const map = { A: 5.00, B: 4.00, C: 3.50, D: 3.00, E: 2.00 };
  return map[grade.toUpperCase()] ?? 0;
}


let nationalDepartments = {};
let diplomaDepartments = {};

fetch('/config')
  .then(res => res.json())
  .then(data => {
    nationalDepartments = data.nationalDepartments;
    diplomaDepartments = data.diplomaDepartments;

    // Now calculate baseTuition AFTER data is loaded
    [ nationalDepartments, diplomaDepartments ].forEach(group => {
      Object.values(group).forEach(dept => {
        if (dept.totalCredit && dept.costPerCredit && dept.flatWeiver !== undefined) {
          dept.baseTuition = dept.totalCredit * dept.costPerCredit * (1 - dept.flatWeiver);
        }
      });
    });

    updateDepartments(); 
  });



// Tuition Initialization (unchanged)
[ nationalDepartments, diplomaDepartments ].forEach(group => {
  Object.values(group).forEach(dept => {
    if (dept.totalCredit && dept.costPerCredit && dept.flatWeiver !== undefined) {
      dept.baseTuition = dept.totalCredit * dept.costPerCredit * (1 - dept.flatWeiver);
    }
  });
});

// Init
document.addEventListener("DOMContentLoaded", () => {
  toggleAdmissionType();
  updateDepartments();
  if (departmentSelect.options.length > 0) departmentSelect.selectedIndex = 0;
});

admissionTypeSelect.addEventListener("change", () => {
  toggleAdmissionType();
  updateDepartments();
  if (departmentSelect.options.length > 0) departmentSelect.selectedIndex = 0;
});

sscInput.addEventListener("input", toggleGolden);
hscInput.addEventListener("input", toggleGolden);

function toggleAdmissionType() {
  const type = admissionTypeSelect.value;
  const isNational = type === "national";
  const isDiploma = type === "diploma";
  const isOlevel = type === "olevel";

  document.querySelectorAll(".gpa-group").forEach(el => {
    el.style.display = isNational ? "" : "none";
  });

  diplomaContainer.classList.toggle("hidden", !isDiploma);
  olevelContainer.classList.toggle("hidden", !isOlevel);
  goldenContainer.classList.toggle("hidden", !(isNational && (parseFloat(sscInput.value) === 5 || parseFloat(hscInput.value) === 5)));
}

function toggleGolden() {
  const s = parseFloat(sscInput.value) === 5;
  const h = parseFloat(hscInput.value) === 5;
  goldenContainer.classList.toggle("hidden", !(s || h));
  if (!s && !h) {
    goldenSsc.checked = false;
    goldenHsc.checked = false;
  }
}

function updateDepartments() {
  const displayNames = {
    cse: "Computer Science & Engineering (CSE)",
    architecture: "Architecture",
    bba: "Business Studies (BBA)",
    english: "English Studies (BA in English)",
    fens: "Food Engineering and Nutritional Science (FENS)",
    jcms: "Journalism, Communication & Media Studies (JCMS)",
    law: "Law (LLB Hons.)",
    pharmacy: "Pharmacy"
  };

  const selected = admissionTypeSelect.value;
  const depts = selected === "diploma" ? diplomaDepartments : nationalDepartments;
  departmentSelect.innerHTML = "";

  // Desired order with "cse" first
  const preferredOrder = selected === "diploma"
    ? ["cse", "architecture", "fens"]
    : ["cse", "architecture", "bba", "english", "fens", "jcms", "law", "pharmacy"];

  preferredOrder.forEach(key => {
    if (depts[key]) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = displayNames[key] || key.toUpperCase();
      departmentSelect.appendChild(option);
    }
  });
}



function getWaiverPct(ssc, hsc, isGoldenSsc, isGoldenHsc, dept) {
  if (dept === "pharmacy") {
    if (isGoldenSsc && isGoldenHsc) return 0.75;
    if (isGoldenHsc && hsc === 5) return 0.60;
    if (ssc === 5 && hsc === 5) return 0.50;
    if (hsc === 5) return 0.40;
    if (hsc >= 4.80) return 0.25;
    if (hsc >= 4.50) return 0.20;
    if (hsc >= 4.25) return 0.05;
  } else {
    if (isGoldenSsc && isGoldenHsc) return 0.75;
    if ((isGoldenHsc && hsc === 5)) return 0.65;
    if (ssc === 5 && hsc === 5) return 0.60;
    if (hsc === 5) return 0.50;
    if (hsc >= 4.80) return 0.35;
    if (hsc >= 4.50) return 0.25;
    if (hsc >= 4.00) return 0.15;
  }
  return 0;
}

// Main submission handler
form.addEventListener("submit", e => {
  e.preventDefault();

  const admissionType = admissionTypeSelect.value;
  const dept = departmentSelect.value;
  const gender = form.gender.value;
  let cfg, w = 0;

  if (admissionType === "diploma") {
    const cgpa = parseFloat(diplomaCgpaInput.value);
    if (isNaN(cgpa)) return alert("Enter your Diploma CGPA.");
    if (cgpa < 0 || cgpa > 4) return alert("Diploma CGPA must be between 0 and 4.00");
    if (cgpa < 2.50) {
      resultCard.innerHTML = `<strong>Ineligible.</strong><br>Minimum CGPA of 2.50 is required for Diploma admission.`;
      resultSection.classList.remove("hidden");
      return;
    }
    w = cgpa >= 3.80 ? 0.30 : cgpa >= 3.50 ? 0.20 : cgpa >= 3.00 ? 0.10 : 0;
    cfg = diplomaDepartments[dept];

} else if (admissionType === "olevel") {
  const oGradesRaw = Array.from(document.querySelectorAll(".olevel-grade"))
    .map(sel => sel.value.toUpperCase());
  const aGradesRaw = Array.from(document.querySelectorAll(".alevel-grade"))
    .map(sel => sel.value.toUpperCase());

  if (oGradesRaw.length < 5 || aGradesRaw.length < 2) {
    resultCard.innerHTML = `<strong>Ineligible.</strong><br>Minimum 5 O-Level and 2 A-Level subjects are required.`;
    resultSection.classList.remove("hidden");
    return;
  }

  const combinedGrades = [...oGradesRaw, ...aGradesRaw];

  if (combinedGrades.length !== 7) {
    resultCard.innerHTML = `<strong>Ineligible.</strong><br>You must provide exactly 7 subjects (5 O-Level + 2 A-Level).`;
    resultSection.classList.remove("hidden");
    return;
  }

  const gradePoints = combinedGrades.map(gradeToPoint);
  const countHigh = gradePoints.filter(g => g >= 4.00).length;
  const countMid = gradePoints.filter(g => g >= 3.50).length;
  const countLow = gradePoints.filter(g => g < 3.50).length;

  if (countHigh < 4 || countMid < 7 || countLow > 0) {
    resultCard.innerHTML = `<strong>Ineligible.</strong><br>You must have at least 4 subjects with GPA ≥ 4.00 and all 7 subjects must have GPA ≥ 3.50. No grade below C is accepted.`;
    resultSection.classList.remove("hidden");
    return;
  }

  // Apply waiver conditions
  const oPoints = oGradesRaw.map(gradeToPoint);
  const aPoints = aGradesRaw.map(gradeToPoint);
  const oAs = oPoints.filter(p => p === 5.00).length;
  const aAs = aPoints.filter(p => p === 5.00).length;
  const aBs = aPoints.filter(p => p === 4.00).length;

  if (oAs >= 5 && aAs === 1 && aBs === 1 || oAs >= 5 && aAs === 2) {
    w = 0.50;
  } else if (oAs >= 5 && aBs === 2) {
    w = 0.40;
  } else if (oAs >= 4) {
    w = 0.25;
  } else {
    w = 0;
  }

  cfg = nationalDepartments[dept];
}
 else {
    const ssc = parseFloat(sscInput.value);
    const hsc = parseFloat(hscInput.value);
    if (isNaN(ssc) || isNaN(hsc)) {
      alert("Please enter both SSC and HSC GPA.");
      return;
    }
    if ((ssc < 2.5 || hsc < 2.5) && (ssc + hsc < 6.0)) {
      resultCard.innerHTML = `<strong>Ineligible.</strong><br> Min GPA 2.50 or combined ≥ 6.00 required.`;
      resultSection.classList.remove("hidden");
      return;
    }
    w = getWaiverPct(ssc, hsc, goldenSsc.checked, goldenHsc.checked, dept);
    cfg = nationalDepartments[dept];
  }

  if (!cfg) return alert("Invalid department selection.");

  let totalWaiver = w;
  if (gender === "female") totalWaiver += 0.10;
  if (totalWaiver > 1) totalWaiver = 1;
  let tuitionAfterWaiver = cfg.baseTuition * (1 - totalWaiver);


  const tuitionPerSem = Math.round(tuitionAfterWaiver / cfg.semesters);
  const totalCostAfterWaiver = Math.round(
    tuitionAfterWaiver +
    cfg.regPerSem * cfg.semesters +
    cfg.devPerSem * cfg.semesters +
    cfg.labPerSem * cfg.semesters +
    25000 + // admission
    2000    // ethics
  );
  const totalSemesterCost = Math.round(tuitionPerSem + cfg.regPerSem + cfg.devPerSem + cfg.labPerSem);

  resultCard.innerHTML = `
  <div class="department-info">
    <h3 class="department-heading">Department Of ${dept.toUpperCase()}</h3>
    <p><strong>Total Credit:</strong> ${cfg.totalCredit}</p>
    <p><strong>Per Credit Fee:</strong> ${cfg.costPerCredit.toLocaleString()} BDT</p>
    <p><strong>Total Semester:</strong> ${cfg.semesters}</p>
    <p><strong>Flat Waiver:</strong> ${(cfg.flatWeiver * 100).toFixed(0)}%</p>
    <br>
    <p><strong>Base Tuition After Flat Waiver (${cfg.durationYears} year):<br></strong> ${cfg.baseTuition.toLocaleString()} BDT</p>
    <p><strong>Waiver Applied:</strong> ${(w * 100).toFixed(0)}%${gender === "female" ? " +10% female" : ""}</p>
  </div>
  <hr>
  <h3>Semester Breakdown <br> (Avarage Cost Each Semester):</h3>
  <div class="semester-fees">
    <p><strong>Tuition Fees (Avg):<br></strong> ${tuitionPerSem.toLocaleString()} BDT</p>
    <p><strong>Registration Fee:<br></strong> ${cfg.regPerSem.toLocaleString()} BDT</p>
    <p><strong>Development Fees:<br></strong> ${cfg.devPerSem.toLocaleString()} BDT</p>
    <p><strong>Lab Fee:<br></strong> ${cfg.labPerSem.toLocaleString()} BDT</p>
    <hr>
    <h3 style="color:DarkSlateGray;"><strong>Total (Avg):</strong> ${totalSemesterCost.toLocaleString()} BDT</h3>
  </div>
  <hr>
  <h3>Total Fee Breakdown (${cfg.durationYears} year):</h3>
  <div class="total-costs">
    <p><strong>Admission Fee:</strong> 25,000 BDT</p>
    <p><strong>Ethics Fee:</strong> 2,000 BDT</p>
    <p><strong>Registration Fees (${cfg.durationYears} year):<br></strong> ${(cfg.regPerSem * cfg.semesters).toLocaleString()} BDT</p>
    <p><strong>Development Fees (${cfg.durationYears} year):<br></strong> ${(cfg.devPerSem * cfg.semesters).toLocaleString()} BDT</p>
    <p><strong>Lab Fees(${cfg.durationYears} year):</strong><br> ${(cfg.labPerSem * cfg.semesters).toLocaleString()} BDT</p>
    <p><strong>Base Tuition Fees (${cfg.durationYears} year):</strong><br> ${cfg.baseTuition.toLocaleString()} BDT</p>
    <hr>
    <p><strong>Total Cost After Waiver (${cfg.durationYears} year):</strong><br><h1 style="color:green;">${totalCostAfterWaiver.toLocaleString()} BDT</h1></p>
  </div>
`;


  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
});
