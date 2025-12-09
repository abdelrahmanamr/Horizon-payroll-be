import { addDays, format } from "date-fns";
export function excelSerialToDate(serial: number): string {
  if (!serial || isNaN(serial) || serial < 1) return "";

  // Excel epoch: 1899-12-30 (but with leap year bug)
  const excelEpoch = new Date(1899, 11, 30);

  // Add days to epoch
  const date = addDays(excelEpoch, serial);

  // Format as YYYY-MM-DD
  return format(date, "yyyy-MM-dd");
}

export function mapAllPayrollPlaintexts(plaintexts: string[]) {
  const fieldNames = [
    "Name",
    "Title",
    "Department",
    "H_Date",
    "Salary_from",
    "Salary_to",
    "Net_Salary",
    "Backdated_Salary",
    "Transportation_Allowance",
    "Housing_Allowance",
    "Overtime",
    "Per_Diem",
    "Bonus",
    "Seasonal_Bonus",
    "Fixed_Bonus",
    "School_Allowance",
    "Sales_Incentive",
    "Pension",
    "GYM_Allowance",
    "Vacation_Balance",
    "Total_Earning",
    "Absent",
    "Penalities",
    "Lateness",
    "Medical",
    "Loans",
    "Unpaid_Leave",
    "Other_Deduction",
    "Total_Deduction",
    "Net_Paid_Salary",
    "Payment_Method",
    "Bank_Acc",
  ];

  // fields that require date conversion
  const dateFields = new Set(["H_Date", "Salary_from", "Salary_to"]);

  return plaintexts.map((line) => {
    const values = line.split(",");
    const payroll: Record<string, any> = {};

    fieldNames.forEach((label, i) => {
      let value = values[i] ?? "";

      // Convert Excel serial numbers to ISO date for date fields
      if (dateFields.has(label)) {
        const num = Number(value);
        value = isNaN(num) ? "" : excelSerialToDate(num);
      }

      payroll[label] = value;
    });

    return payroll;
  });
}
