import axios from "axios";
import { mapFirestoreEncryptedData } from "../mapper/FirestoreEncryptionMapper";
import { connectToDatabase } from "../server";
import { UserKey } from "../models/UserKey";
import {
  buildIkm,
  decryptString,
  deriveKeyHKDF,
  zeroBuffer,
} from "../lib/crypto";
import {
  mapAllPayrollPlaintexts,
  mapPayrollToStructured,
} from "../mapper/DecipheredTextMapper";
import { fillPayslip } from "../services/payroll.service";
import { authenticate } from "../auth/microsoft.auth";
import { db } from "../lib/firebaseAdmin";

class PayrollController {
  // GET /employee/:id
  getPayrollsByEmployeeId = async (req, res) => {
    try {
      const employeeId = req.params.employeeId;

      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      // TODO refactor this url
      const snapshot = await db
        .collection("encrypted_employee_data")
        .doc(employeeId)
        .get();

      // console.log("Snapshot data:", results);

      if (!snapshot.exists) {
        return res.status(404).json({ error: "Employee data not found" });
      }

      const employeeInfoFirebase = snapshot.data();

      await connectToDatabase();

      // should be replaced with employeeId
      const uk = await UserKey.findOne({
        username: employeeId,
      }).exec();

      if (!uk) return res.status(404).json({ error: "user key not found" });

      if (uk.microsoftUser) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        const isAuthorized = authenticate(token, uk.userObjectId);
        if (!isAuthorized) {
          return res.status(401).json({ error: "Unauthorized user" });
        }
      }

      const ikm = buildIkm(uk.userObjectId, employeeId);
      const key = deriveKeyHKDF(ikm, uk.seed);

      const plaintexts = employeeInfoFirebase.encrypted.map((msg) =>
        decryptString(msg, key)
      );

      const payrollArray = mapAllPayrollPlaintexts(plaintexts);

      zeroBuffer(key);
      zeroBuffer(ikm as unknown as Buffer);

      return res.json({ payrollArray });
    } catch (error: any) {
      console.error("Error fetching Firestore data:", error.message);

      return res.status(500).json({
        error: "Failed to fetch employee data",
        details: error.response?.data || error.message,
      });
    }
  };

  getPayrollsByEmployeeIdForMobile = async (req, res) => {
    try {
      const employeeId = req.params.employeeId;

      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      // TODO refactor this url
      const snapshot = await db
        .collection("encrypted_employee_data")
        .doc(employeeId)
        .get();

      // console.log("Snapshot data:", results);

      if (!snapshot.exists) {
        return res.status(404).json({ error: "Employee data not found" });
      }

      const employeeInfoFirebase = snapshot.data();

      await connectToDatabase();

      // should be replaced with employeeId
      const uk = await UserKey.findOne({
        username: employeeId,
      }).exec();

      if (!uk) return res.status(404).json({ error: "user key not found" });

      const ikm = buildIkm(uk.userObjectId, employeeId);
      const key = deriveKeyHKDF(ikm, uk.seed);

      const plaintexts = employeeInfoFirebase.encrypted.map((msg) =>
        decryptString(msg, key)
      );

      const payrollArray = mapAllPayrollPlaintexts(plaintexts);
      const structuredPayrolls = payrollArray.map(mapPayrollToStructured);

      zeroBuffer(key);
      zeroBuffer(ikm as unknown as Buffer);

      return res.json({ payrolls: structuredPayrolls });
    } catch (error: any) {
      console.error("Error fetching Firestore data:", error.message);

      return res.status(500).json({
        error: "Failed to fetch employee data",
        details: error.response?.data || error.message,
      });
    }
  };

  getPayslipForEmployee = async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { year, month } = req.query;

      if (!employeeId) {
        return res
          .status(400)
          .json({ error: "Employee ID and Payroll ID are required" });
      }

      if (!year || !month) {
        return res.status(400).json({ error: "Year and Month are required" });
      }

      const snapshot = await db
        .collection("encrypted_employee_data")
        .doc(employeeId)
        .get();

      // console.log("Snapshot data:", results);

      if (!snapshot.exists) {
        return res.status(404).json({ error: "Employee data not found" });
      }

      const employeeInfoFirebase = snapshot.data();

      await connectToDatabase();

      // should be replaced with employeeId
      const uk = await UserKey.findOne({
        username: employeeId,
      }).exec();

      if (!uk) return res.status(404).json({ error: "user key not found" });

      const ikm = buildIkm(uk.userObjectId, employeeId);
      const key = deriveKeyHKDF(ikm, uk.seed);

      const plaintexts = employeeInfoFirebase.encrypted.map((msg) =>
        decryptString(msg, key)
      );

      const payrollArray = mapAllPayrollPlaintexts(plaintexts);

      const monthPayroll = getPayrollForMonthYear(
        payrollArray,
        Number(year),
        Number(month)
      );

      if (!monthPayroll) {
        return res.status(404).json({
          error: "Payroll not found for the specified month and year",
        });
      }

      const pdfBytes = await fillPayslip({
        name: monthPayroll.Name,
        employeeId: employeeId,
        title: monthPayroll.Title,
        department: monthPayroll.Department,
        hiringDate: monthPayroll.H_Date,
        paymentMethod: monthPayroll.Payment_Method,
        accountNumber: monthPayroll.Bank_Acc,
        salaryFrom: monthPayroll.Salary_from,
        salaryTo: monthPayroll.Salary_to,
        payDate: monthPayroll.Salary_to, // missing

        currentSalary: monthPayroll.Net_Salary,
        currentBackdated: monthPayroll.Backdated_Salary,
        currentTransport: monthPayroll.Transportation_Allowance,
        currentHousing: monthPayroll.Housing_Allowance,
        currentOvertime: monthPayroll.Overtime,
        currentPerDiem: monthPayroll.Per_Diem,
        currentBonus: monthPayroll.Bonus,
        currentFixedBonus: monthPayroll.Fixed_Bonus,
        currentSeasonalBonus: monthPayroll.Seasonal_Bonus,
        currentSchool: monthPayroll.School_Allowance,
        currentSales: monthPayroll.Sales_Incentive,
        currentPension: monthPayroll.Pension,
        currentGym: monthPayroll.GYM_Allowance,
        currentVacation: monthPayroll.Vacation_Balance,
        currentTotalEarning: monthPayroll.Total_Earning,
        currentAbsent: monthPayroll.Absent,
        currentPenalties: monthPayroll.Penalities,
        currentLateness: monthPayroll.Lateness,
        currentMedical: monthPayroll.Medical,
        currentLoan: monthPayroll.Loans,
        currentUnpaidLeave: monthPayroll.Unpaid_Leave,
        currentOther: monthPayroll.Other_Deduction,
        currentTotalDeduction: monthPayroll.Total_Deduction,

        netPaidSalary: monthPayroll.Net_Paid_Salary,
      });

      zeroBuffer(key);
      zeroBuffer(ikm as unknown as Buffer);

      // return res.json({ payrollArray });

      // Set headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=payslip.pdf");
      res.setHeader("Content-Length", pdfBytes.length);
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      // Send the PDF
      res.send(Buffer.from(pdfBytes));
    } catch (error: any) {
      console.error("Error fetching payroll:", error.message);
      return res.status(500).json({ error: "Failed to fetch payroll" });
    }
  };

  // POST /payslip
  createPayslip = async (req, res) => {
    try {
      const {
        EmployeId,
        Name,
        Title,
        Department,
        H_Date,
        Salary_from,
        Salary_to,
        Net_Salary,
        Backdated_Salary,
        Transportation_Allowance,
        Housing_Allowance,
        Overtime,
        Per_Diem,
        Bonus,
        Seasonal_Bonus,
        Fixed_Bonus,
        School_Allowance,
        Sales_Incentive,
        Pension,
        GYM_Allowance,
        Vacation_Balance,
        Total_Earning,
        Absent,
        Penalities,
        Lateness,
        Medical,
        Loans,
        Unpaid_Leave,
        Other_Deduction,
        Total_Deduction,
        Net_Paid_Salary,
        Payment_Method,
        Bank_Acc,
      } = req.body;
      const pdfBytes = await fillPayslip({
        name: Name,
        employeeId: EmployeId,
        title: Title,
        department: Department,
        hiringDate: H_Date,
        paymentMethod: Payment_Method,
        accountNumber: Bank_Acc,
        salaryFrom: Salary_from,
        salaryTo: Salary_to,
        payDate: Salary_to, // missing

        currentSalary: Net_Salary,
        currentBackdated: Backdated_Salary,
        currentTransport: Transportation_Allowance,
        currentHousing: Housing_Allowance,
        currentOvertime: Overtime,
        currentPerDiem: Per_Diem,
        currentBonus: Bonus,
        currentFixedBonus: Fixed_Bonus,
        currentSeasonalBonus: Seasonal_Bonus,
        currentSchool: School_Allowance,
        currentSales: Sales_Incentive,
        currentPension: Pension,
        currentGym: GYM_Allowance,
        currentVacation: Vacation_Balance,
        currentTotalEarning: Total_Earning,

        currentAbsent: Absent,
        currentPenalties: Penalities,
        currentLateness: Lateness,
        currentMedical: Medical,
        currentLoan: Loans,
        currentUnpaidLeave: Unpaid_Leave,
        currentOther: Other_Deduction,
        currentTotalDeduction: Total_Deduction,

        netPaidSalary: Net_Paid_Salary,
      });

      // Set headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=offer.pdf");
      res.setHeader("Content-Length", pdfBytes.length);
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      // Send the PDF
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
}

function getPayrollForMonthYear(payrollArray, year, month) {
  // Format month to two digits (01, 02, etc.)
  const monthStr = month.toString().padStart(2, "0");
  const searchPattern = `${year}-${monthStr}`;

  // Use find() to get a single object or undefined
  return payrollArray.find((payroll) => {
    // Check if Salary_from starts in the target month/year
    return payroll.Salary_from.startsWith(searchPattern);
  });
}

export default PayrollController;
