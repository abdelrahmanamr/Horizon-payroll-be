import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function fillPayslip(fields) {
  try {
    const templatePath = path.resolve("template/", "payslip-template.pdf");
    const existingPdfBytes = fs.readFileSync(templatePath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.getPages()[0];

    // Loop through all fields and draw text
    Object.keys(fieldCoordinates).forEach((key) => {
      if (!fields[key]) return; // skip empty fields

      const { x, y } = fieldCoordinates[key];

      page.drawText(String(fields[key]), {
        x,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
}

export const fieldCoordinates = {
  name: { x: 65, y: 740 },
  employeeId: { x: 56, y: 722 },
  title: { x: 38, y: 704 },
  department: { x: 72, y: 686 },
  hiringDate: { x: 70, y: 669 },
  paymentMethod: { x: 96, y: 652 },
  accountNumber: { x: 94, y: 634 },
  salaryFrom: { x: 121, y: 598 },
  salaryTo: { x: 195, y: 598 },
  payDate: { x: 495, y: 597 },

  currentSalary: { x: 156, y: 537 },
  yearlySalary: { x: 230, y: 537 },

  currentBackdated: { x: 156, y: 514 },
  yearlyBackdated: { x: 230, y: 514 },

  currentTransport: { x: 156, y: 493 },
  yearlyTransport: { x: 230, y: 493 },

  currentHousing: { x: 156, y: 472 },
  yearlyHousing: { x: 230, y: 472 },

  currentOvertime: { x: 156, y: 450 },
  yearlyOvertime: { x: 230, y: 450 },

  currentPerDiem: { x: 156, y: 429 },
  yearlyPerDiem: { x: 230, y: 429 },

  currentBonus: { x: 156, y: 406 },
  yearlyBonus: { x: 230, y: 406 },

  currentSeasonalBonus: { x: 156, y: 385 },
  yearlySeasonalBonus: { x: 230, y: 385 },

  currentFixedBonus: { x: 156, y: 363 },
  yearlyFixedBonus: { x: 230, y: 363 },

  currentSchool: { x: 156, y: 341 },
  yearlySchool: { x: 230, y: 341 },

  currentSales: { x: 156, y: 320 },
  yearlySales: { x: 230, y: 320 },

  currentPension: { x: 156, y: 298 },
  yearlyPension: { x: 230, y: 298 },

  currentGym: { x: 156, y: 276 },
  yearlyGym: { x: 230, y: 276 },

  currentVacation: { x: 156, y: 254 },
  yearlyVacation: { x: 230, y: 254 },

  currentAbsent: { x: 438, y: 535 },
  yearlyAbsent: { x: 514, y: 535 },

  currentPenalties: { x: 438, y: 513 },
  yearlyPenalties: { x: 514, y: 513 },

  currentLateness: { x: 438, y: 491 },
  yearlyLateness: { x: 514, y: 491 },

  currentMedical: { x: 438, y: 469 },
  yearlyMedical: { x: 514, y: 469 },

  currentLoan: { x: 438, y: 447 },
  yearlyLoan: { x: 514, y: 447 },

  currentUnpaidLeave: { x: 438, y: 425 },
  yearlyUnpaidLeave: { x: 514, y: 425 },

  currentOther: { x: 438, y: 404 },
  yearlyOther: { x: 514, y: 404 },

  currentTotalDeduction: { x: 438, y: 209 },
  yearlyTotalDeduction: { x: 514, y: 209 },

  currentTotalEarning: { x: 156, y: 209 },
  yearlyTotalEarning: { x: 230, y: 209 },

  netPaidSalary: { x: 230, y: 145 },
};
