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
import { mapAllPayrollPlaintexts } from "../mapper/DecipheredTextMapper";
import { fillPayslip } from "../services/payroll.service";
import dotenv from "dotenv";

class PayrollController {
  // GET /employee/:id
  getPayrollsByEmployeeId = async (req, res) => {
    try {
      const employeeId = req.params.employeeId;

      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID is required" });
      }
      // TODO refactor this url
      const url = `https://firestore.googleapis.com/v1/projects/horizon-hr-2cfd3/databases/(default)/documents/encrypted_employee_data/${employeeId}`;

      const response = await axios.get(url);
      const mapped = mapFirestoreEncryptedData(response.data);

      await connectToDatabase();

      // should be replaced with employeeId
      const uk = await UserKey.findOne({
        username: employeeId,
      }).exec();

      if (!uk) return res.status(404).json({ error: "user key not found" });

      const ikm = buildIkm(uk.userObjectId, employeeId);
      const key = deriveKeyHKDF(ikm, uk.seed);

      const plaintexts = mapped.encrypted.map((msg) => decryptString(msg, key));

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
export default PayrollController;
